# OMEGA-OS Build Environment
# Dockerfile for creating OMEGA-OS in a containerized build environment
#
# Usage:
#   docker build -t omega-os-builder .
#   docker run --privileged -v /dev:/dev -v $(pwd)/output:/output omega-os-builder
#

FROM debian:bookworm-slim

LABEL maintainer="OmegAI Collective"
LABEL description="Build environment for OMEGA-OS portable distribution"
LABEL version="1.0.0"

# Avoid interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install build dependencies
RUN apt-get update && apt-get install -y \
    debootstrap \
    xorriso \
    syslinux \
    syslinux-common \
    isolinux \
    mtools \
    squashfs-tools \
    parted \
    dosfstools \
    e2fsprogs \
    git \
    curl \
    wget \
    cpio \
    genisoimage \
    live-build \
    && rm -rf /var/lib/apt/lists/*

# Create build directories
RUN mkdir -p /build /output

# Copy build scripts
COPY build.sh /build/
COPY config/ /build/config/
COPY rootfs/ /build/rootfs/
COPY scripts/ /build/scripts/

# Make scripts executable
RUN chmod +x /build/build.sh /build/scripts/*.sh 2>/dev/null || true

WORKDIR /build

# Default command - build ISO
CMD ["./build.sh", "--output", "/output/omega-os.iso", "--iso"]
