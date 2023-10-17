# GitHub Actions

The workflow definitions build and test the Node-Red nodes.
On merge with master, a release push to npmjs happens

## Files in use

- build-and-test.yml: Build on the last 3 versions of NodeJS, use a couchDB service for tests
- beta-deploy-to-npm: Deploys on merge with `develop` to npm with the tag "beta"
- deploy-to-npm: Deploys to npm with the tag pulled from package.json

WORK IN PROGRESS
