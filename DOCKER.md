# Docker images

GitHub Actions publishes `ghcr.io/leia-org/leia-designer-backend` for pushes to `main` and
`develop`. Pull requests build the image without publishing it. The workflow can
also be run manually on either stable branch.

| Source | Tags |
| --- | --- |
| `main` | `main`, `latest`, `main-<full-commit-sha>`, `<full-commit-sha>` |
| `develop` | `develop`, `develop-<full-commit-sha>` |

Images target `linux/amd64`. `develop` never updates `latest` or the unprefixed
commit tag. Publishing uses the repository's automatic `GITHUB_TOKEN` with
`packages: write`; no registry password or personal token is required. The Actions
summary includes the published tags and digest.

The Docker context excludes local environment files, Git metadata, dependency
folders, logs and private key files.

## Runtime configuration

Provide service credentials and connection strings when starting the container,
using your deployment platform or an external environment file. They are not
included in the image. See `.env.example` for supported settings.

```sh
docker run --rm --env-file /path/to/runtime.env -p 3000:3000 \
  ghcr.io/leia-org/leia-designer-backend:develop
```
