async function autoMergePRs(github, context) {
  // Get all open PRs
  const { data: pullRequests } = await github.rest.pulls.list({
    owner: context.repo.owner,
    repo: context.repo.repo,
    state: 'open',
    per_page: 100
  });

  console.log(`Found ${pullRequests.length} open PRs to check for merging`);

  for (const pr of pullRequests) {
    console.log(`\nChecking PR #${pr.number}: ${pr.title}`);

    // Get reviews for this PR
    const { data: reviews } = await github.rest.pulls.listReviews({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number
    });

    // Check if PR has at least one approval
    const hasApproval = reviews.some(review => review.state === 'APPROVED');

    if (!hasApproval) {
      console.log(`❌ PR #${pr.number} does not have approval, skipping`);
      continue;
    }
    console.log(`✓ PR has approval`);

    // Check if all required checks have passed
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
    const allChecksPassed = checkRuns.check_runs.length === 0 ||
      checkRuns.check_runs.every(check =>
        check.status === 'completed' &&
        (check.conclusion === 'success' || check.conclusion === 'skipped' || check.conclusion === 'neutral')
      );

    const allStatusesPassed = statuses.state === 'success' ||
      (statuses.statuses.length === 0 && checkRuns.check_runs.length > 0);

    if (!allChecksPassed) {
      console.log(`❌ PR #${pr.number} has pending or failing check runs`);
      console.log(`Check runs:`, checkRuns.check_runs.map(c => ({
        name: c.name,
        status: c.status,
        conclusion: c.conclusion
      })));
      continue;
    }

    if (!allStatusesPassed && statuses.statuses.length > 0) {
      console.log(`❌ PR #${pr.number} has failing statuses: ${statuses.state}`);
      continue;
    }
    console.log(`✓ All checks passed`);

    // Check if PR is mergeable
    const { data: prDetails } = await github.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number
    });

    if (prDetails.mergeable === false) {
      console.log(`❌ PR #${pr.number} has merge conflicts`);
      continue;
    }

    if (prDetails.mergeable === null) {
      console.log(`⚠️  PR #${pr.number} merge status not yet computed, skipping for now`);
      continue;
    }
    console.log(`✓ PR is mergeable`);

    // Merge the PR
    try {
      await github.rest.pulls.merge({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: pr.number,
        merge_method: 'squash',
        commit_title: `${pr.title} (#${pr.number})`,
        commit_message: pr.body || ''
      });
      console.log(`✅ Successfully merged PR #${pr.number}`);
    } catch (error) {
      console.log(`❌ Failed to merge PR #${pr.number}: ${error.message}`);
    }
  }
}

module.exports = { autoMergePRs };
