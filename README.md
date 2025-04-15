# SoraNova Docs

This repository houses the code for the docs [site](https://docs.soranova.ai). 

### Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mintlify) to preview the documentation changes locally. To install, use the following command

```
npm i -g mintlify
```

Run the following command at the root of your documentation (where docs.json is)

```
mintlify dev
```

### Publishing Changes

Changes pushed to the main branch will automatically get propagated to the live site. 

#### Troubleshooting

- Mintlify dev isn't running - Run `mintlify install` it'll re-install dependencies.
