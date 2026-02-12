# Scrutiny - Claude Code Instructions

## Toolchain

- **Go**: Always use `~/go/bin/go1.25.0` for all Go commands. The system Go (1.22) is too old.
- **Lint**: Always use `~/go/bin/golangci-lint` (v2.8.0). No other lint binary.

## Build & Verify Commands

```bash
~/go/bin/go1.25.0 vet ./...
~/go/bin/go1.25.0 build ./...
~/go/bin/go1.25.0 test ./...
~/go/bin/golangci-lint run ./...
```

Run all four before committing any Go changes.

## Testing

- Integration tests (`TestServerTestSuite_*` in `webapp/backend/pkg/web`) require InfluxDB on `localhost:8086` and will fail locally. This is expected.
- To run unit tests only: `~/go/bin/go1.25.0 test $(~/go/bin/go1.25.0 list ./... | grep -v 'pkg/web$')`

## Project Structure

- Go backend: `webapp/backend/`
- React frontend: `webapp/frontend-react/` (Vite 7, React 19, TanStack, shadcn/ui, Tailwind CSS 4)
- Docker files: `docker/`
- Collector (smartctl wrapper): `collector/`
- ZFS collector: `collector/cmd/collector-zfs/`, `collector/pkg/zfs/`
- Version file: `webapp/backend/pkg/version/version.go`
- WWN validation: `webapp/backend/pkg/web/handler/validate.go`

## Lint Configuration

`.golangci.yml` excludes: `ST*`/`QF*` style checks disabled, `errcheck` excluded in test files and `*.Close()` patterns, `SA1019` excluded in migration files, `errcheck` excluded for `fmt.Fprint*`/`color.Fprintf`.

## Docker

- Omnibus image: `linux/amd64` and `linux/arm64` only. No `linux/arm/v7` — InfluxDB 2.x has no 32-bit ARM package.
- Web and collector images support `linux/amd64`, `linux/arm64`, and `linux/arm/v7`.
- Omnibus runs as root (required by s6-overlay for process supervision).

## Session Workflow

- Read `HANDOFF.md` at the start of every session.
