# syntax=docker/dockerfile:1.4
########################################################################################################################
# Omnibus Image
########################################################################################################################

######## Build the frontend
FROM --platform=${BUILDPLATFORM} node:24-bookworm AS frontendbuild
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /go/src/github.com/analogj/scrutiny
COPY --link webapp/frontend-react/package.json webapp/frontend-react/pnpm-lock.yaml ./webapp/frontend-react/
RUN cd webapp/frontend-react && pnpm install --frozen-lockfile
COPY --link webapp/frontend-react ./webapp/frontend-react
RUN cd webapp/frontend-react && pnpm run build


######## Build the backend
FROM golang:1.25-bookworm as backendbuild

WORKDIR /go/src/github.com/analogj/scrutiny
COPY --link . /go/src/github.com/analogj/scrutiny
RUN apt-get update && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
    file \
    && rm -rf /var/lib/apt/lists/*
RUN make binary-clean binary-all WEB_BINARY_NAME=scrutiny


######## Combine build artifacts in runtime image
FROM debian:bookworm-slim as runtime
ARG TARGETARCH
EXPOSE 8080
WORKDIR /opt/scrutiny
ENV PATH="/opt/scrutiny/bin:${PATH}"
ENV INFLUXD_CONFIG_PATH=/opt/scrutiny/influxdb
ENV S6VER="3.1.6.2"
ENV INFLUXVER="2.2.0"
ENV S6_SERVICES_READYTIME=1000
SHELL ["/usr/bin/sh", "-c"]

RUN apt-get update && DEBIAN_FRONTEND=noninteractive \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    cron \
    curl \
    smartmontools \
    tzdata \
    procps \
    xz-utils \
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
RUN curl -L https://dl.influxdata.com/influxdb/releases/influxdb2-${INFLUXVER}-${TARGETARCH}.deb --output /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb \
    && case ${TARGETARCH} in \
           "amd64")  echo "dccc6cbf8af734407488d9b91c71b72f49c8cf4da2746e891be09b16f9b510d6  /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb" ;; \
           "arm64")  echo "7eb1ea43ef07595207377d45b7859ff4def144bafc1375ef9c5635cd9b1d1b8e  /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb" ;; \
       esac | sha256sum --check \
    && dpkg -i --force-all /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb \
    && rm -rf /tmp/influxdb2-${INFLUXVER}-${TARGETARCH}.deb

COPY /rootfs /

COPY --link --from=backendbuild --chmod=755 /go/src/github.com/analogj/scrutiny/scrutiny /opt/scrutiny/bin/
COPY --link --from=backendbuild --chmod=755 /go/src/github.com/analogj/scrutiny/scrutiny-collector-metrics /opt/scrutiny/bin/
COPY --link --from=frontendbuild --chmod=644 /go/src/github.com/analogj/scrutiny/webapp/frontend-react/dist /opt/scrutiny/web
RUN chmod 0644 /etc/cron.d/scrutiny && \
    rm -f /etc/cron.daily/* && \
    mkdir -p /opt/scrutiny/web && \
    mkdir -p /opt/scrutiny/config && \
    chmod -R ugo+rwx /opt/scrutiny/config && \
    chmod +x /etc/cont-init.d/* && \
    chmod +x /etc/services.d/*/run && \
    chmod +x /etc/services.d/*/finish

HEALTHCHECK --interval=30s --timeout=10s --retries=3 CMD curl -f http://localhost:8080/api/health || exit 1

CMD ["/init"]
