const fs = require('fs');

async function autoApprovePRs(github, context) {
  // Load authorized users from config
  const config = JSON.parse(fs.readFileSync('.github/auto-approve-config.json', 'utf8'));
  const authorizedUsers = config.authorizedUsers;

  console.log('Authorized users:', authorizedUsers);

  // Get all open PRs
  const { data: pullRequests } = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    per_page: 100
  });

  console.log(`Found ${pullRequests.length} open PRs`);

  for (const pr of pullRequests) {
    console.log(`\nProcessing PR #${pr.number}: ${pr.title}`);
    console.log(`Author: ${pr.user.login}`);

    // Check if author is authorized
    if (!authorizedUsers.includes(pr.user.login)) {
      console.log(`❌ Author ${pr.user.login} is not in authorized list`);
      continue;
    }
    console.log(`✓ Author is authorized`);

    // Check for merge conflicts
    if (pr.mergeable === false) {
      console.log(`❌ PR has merge conflicts`);
      continue;
    }

    if (pr.mergeable === null) {
      console.log(`⚠️  Merge status not yet computed, skipping for now`);
      continue;
    }
    console.log(`✓ No merge conflicts`);

    // Check CI status
    const { data: checkRuns } = await github.rest.checks.listForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: pr.head.sha,
      per_page: 100
    });

    const { data: statuses } = await github.rest.repos.getCombinedStatusForRef({
      owner: context.repo.owner,
      repo: context.repo.repo,
      ref: pr.head.sha
    });

    // Check if all checks have passed
    const allChecksPassed = checkRuns.check_runs.every(check =>
      check.conclusion === 'success' || check.conclusion === 'skipped' || check.conclusion === 'neutral'
    );

    const allStatusesPassed = statuses.state === 'success' ||
                             (statuses.statuses.length === 0 && checkRuns.check_runs.length > 0);

    const hasAnyChecks = checkRuns.check_runs.length > 0 || statuses.statuses.length > 0;

    if (!hasAnyChecks) {
      console.log(`⚠️  No CI checks found, skipping`);
      continue;
    }

    if (!allChecksPassed) {
      console.log(`❌ Not all check runs passed`);
      console.log(`Check runs:`, checkRuns.check_runs.map(c => ({ name: c.name, conclusion: c.conclusion })));
      continue;
    }

    if (!allStatusesPassed && statuses.statuses.length > 0) {
      console.log(`❌ Combined status is not success: ${statuses.state}`);
      continue;
    }

    console.log(`✓ All CI checks passed`);

    // Check if already approved by this workflow
    const { data: reviews } = await github.rest.pulls.listReviews({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number
    });

    const alreadyApproved = reviews.some(review =>
      review.user.login === 'github-actions[bot]' &&
      review.state === 'APPROVED'
    );

    if (alreadyApproved) {
      console.log(`✓ Already approved by this workflow`);
      continue;
    }

    // All conditions met - approve the PR
    console.log(`✅ All conditions met, approving PR #${pr.number}`);

    await github.rest.pulls.createReview({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number,
      event: 'APPROVE',
      body: '✅ Auto-approved: PR author is authorized, all CI checks passed, and no merge conflicts detected.'
    });

    console.log(`✅ Successfully approved PR #${pr.number}`);
  }
}

module.exports = { autoApprovePRs };
