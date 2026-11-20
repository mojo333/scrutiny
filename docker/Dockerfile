# syntax=docker/dockerfile:1.4
########################################################################################################################
# Omnibus Image
########################################################################################################################

######## Build the frontend
FROM --platform=${BUILDPLATFORM} node:24-bookworm AS frontendbuild
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /go/src/github.com/analogj/scrutiny
COPY --link webapp/frontend-react/package.json webapp/frontend-react/pnpm-lock.yaml webapp/frontend-react/pnpm-workspace.yaml ./webapp/frontend-react/
RUN cd webapp/frontend-react && pnpm install --frozen-lockfile
COPY --link webapp/frontend-react ./webapp/frontend-react
RUN cd webapp/frontend-react && pnpm run build


######## Build the backend
FROM golang:1.27-trixie as backendbuild
ARG TARGETOS
ARG TARGETARCH

WORKDIR /go/src/github.com/analogj/scrutiny
COPY --link Makefile /go/src/github.com/analogj/scrutiny/
COPY --link go.mod go.sum /go/src/github.com/analogj/scrutiny/
COPY --link collector /go/src/github.com/analogj/scrutiny/collector
COPY --link webapp/backend /go/src/github.com/analogj/scrutiny/webapp/backend
RUN apt-get update && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
    file \
    && rm -rf /var/lib/apt/lists/*
# this stage isn't pinned to --platform=$BUILDPLATFORM, so buildx already runs it
# natively/emulated per target platform; GOOS/GOARCH here only feed the version
# banner's ldflags (main.goos/main.goarch), not cross-compilation. Both binary
# names are pinned too, since the Makefile appends -$(GOOS)-$(GOARCH) to whichever
# one isn't already overridden on the command line, which would break the COPY
# --from=backendbuild steps below
RUN make binary-clean binary-all WEB_BINARY_NAME=scrutiny COLLECTOR_BINARY_NAME=scrutiny-collector-metrics COLLECTOR_ZFS_BINARY_NAME=scrutiny-collector-zfs GOOS=$TARGETOS GOARCH=$TARGETARCH


######## Build smartmontools from source
FROM debian:trixie-slim AS smartmontoolsbuild
ARG SMARTMONTOOLS_VER=7.5
RUN apt-get update && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
    ca-certificates curl gcc g++ gnupg make \
    && rm -rf /var/lib/apt/lists/*
RUN curl -L "https://github.com/smartmontools/smartmontools/releases/download/RELEASE_$(echo ${SMARTMONTOOLS_VER} | tr '.' '_')/smartmontools-${SMARTMONTOOLS_VER}.tar.gz" -o /tmp/smartmontools.tar.gz \
    && tar -xzf /tmp/smartmontools.tar.gz -C /tmp \
    && cd /tmp/smartmontools-${SMARTMONTOOLS_VER} \
    && ./configure --prefix=/usr LDFLAGS='-static' --without-libcap-ng --without-libsystemd \
    && make -j"$(nproc)" \
    && make install \
    && /usr/sbin/update-smart-drivedb \
    && rm -rf /tmp/smartmontools*


######## Combine build artifacts in runtime image
FROM debian:trixie-slim AS runtime
ARG TARGETARCH
EXPOSE 8080
WORKDIR /opt/scrutiny
ENV PATH="/opt/scrutiny/bin:${PATH}"
ENV INFLUXD_CONFIG_PATH=/opt/scrutiny/influxdb
ENV S6VER="3.1.6.2"
ENV INFLUXVER="2.8.0"
ENV S6_SERVICES_READYTIME=1000
SHELL ["/usr/bin/sh", "-c"]

RUN echo "deb http://deb.debian.org/debian bookworm contrib" >> /etc/apt/sources.list && \
    echo "deb http://deb.debian.org/debian bookworm-updates contrib" >> /etc/apt/sources.list && \
    apt-get update && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    cron \
    curl \
    tzdata \
    procps \
    xz-utils \
    zfsutils-linux \
    && rm -rf /var/lib/apt/lists/* \
    && update-ca-certificates \
    && case ${TARGETARCH} in \
           "amd64")  S6_ARCH=x86_64  ;; \
           "arm64")  S6_ARCH=aarch64  ;; \
       esac \
    && curl https://github.com/just-containers/s6-overlay/releases/download/v${S6VER}/s6-overlay-noarch.tar.xz -L -s --output /tmp/s6-overlay-noarch.tar.xz \
    && echo "05af2536ec4fb23f087a43ce305f8962512890d7c71572ed88852ab91d1434e3  /tmp/s6-overlay-noarch.tar.xz" | sha256sum --check \
    && tar -Jxpf /tmp/s6-overlay-noarch.tar.xz -C / \
    && rm -rf /tmp/s6-overlay-noarch.tar.xz \
    && curl https://github.com/just-containers/s6-overlay/releases/download/v${S6VER}/s6-overlay-${S6_ARCH}.tar.xz -L -s --output /tmp/s6-overlay-${S6_ARCH}.tar.xz \
    && case ${TARGETARCH} in \
           "amd64")  echo "95081f11c56e5a351e9ccab4e70c2b1c3d7d056d82b72502b942762112c03d1c  /tmp/s6-overlay-${S6_ARCH}.tar.xz" ;; \
           "arm64")  echo "3fc0bae418a0e3811b3deeadfca9cc2f0869fb2f4787ab8a53f6944067d140ee  /tmp/s6-overlay-${S6_ARCH}.tar.xz" ;; \
       esac | sha256sum --check \
    && tar -Jxpf /tmp/s6-overlay-${S6_ARCH}.tar.xz -C / \
    && rm -rf /tmp/s6-overlay-${S6_ARCH}.tar.xz
# checksums from the GPG-verified 2.8.0 packages; InfluxData publishes no .sha256 for them
RUN curl -L https://dl.influxdata.com/influxdb/releases/influxdb2_${INFLUXVER}-1_${TARGETARCH}.deb --output /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb \
    && case ${TARGETARCH} in \
           "amd64")  echo "a4f2bcbf858ea664136c83faf603aa694edef4d1a54b11ad8305126fd77e9142  /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb" ;; \
           "arm64")  echo "b0a5326a3ecaad20176528dd7404a3b262bb59a9eae15095fb5f2bab085e2757  /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb" ;; \
       esac | sha256sum --check \
    && dpkg -i --force-all /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb \
    && rm -rf /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb

COPY /rootfs /

COPY --from=smartmontoolsbuild /usr/sbin/smartctl /usr/sbin/smartctl
COPY --from=smartmontoolsbuild /usr/share/smartmontools/ /usr/share/smartmontools/

COPY --link --from=backendbuild --chmod=755 /go/src/github.com/analogj/scrutiny/scrutiny /opt/scrutiny/bin/
COPY --link --from=backendbuild --chmod=755 /go/src/github.com/analogj/scrutiny/scrutiny-collector-metrics /opt/scrutiny/bin/
COPY --link --from=backendbuild --chmod=755 /go/src/github.com/analogj/scrutiny/scrutiny-collector-zfs /opt/scrutiny/bin/
COPY --link --from=frontendbuild --chmod=644 /go/src/github.com/analogj/scrutiny/webapp/frontend-react/dist /opt/scrutiny/web
RUN chmod 0644 /etc/cron.d/scrutiny && \
    chmod 0644 /etc/cron.d/scrutiny-zfs && \
    rm -f /etc/cron.daily/* && \
    mkdir -p /opt/scrutiny/web && \
    chmod -R a+rX /opt/scrutiny/web && \
    mkdir -p /opt/scrutiny/config && \
    # Config holds the auto-generated InfluxDB token; keep it out of world/other perms.
    # This image runs its services as root, so owner (root) rwx is sufficient.
    chmod -R u+rwX,go-rwx /opt/scrutiny/config && \
    chmod +x /etc/cont-init.d/* && \
    chmod +x /etc/services.d/*/run && \
    chmod +x /etc/services.d/*/finish

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["/init"]
