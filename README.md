# fuwa.jp

English | [日本語版](./README.md)

A futuristic typography viewing experience powered by WebGPU (Three.js / TSL).

## Overview
`fuwa.jp` is an interactive website showcasing the power of **WebGPU**, the next-generation web graphics standard. It merges the "floating" (fuwa) sensation of its domain name with cutting-edge digital aesthetics.

## Features
- **WebGPU (TSL) Materials**: Utilizes Three.js Shading Language (TSL) for advanced vertex-level edge highlighting (Fresnel reflection) and glowing animations.
- **Universal Design**: Employs a color scheme centered on "UD Yellow," meticulously chosen to ensure optimal clarity and consistent visual recognition for all users regardless of their viewing environment or vision style.
- **Interactive Viewing Mode**: A figure-like exhibition experience where users can rotate and inspect 3D typography from any angle via mouse or touch.
- **High-Performance Dev Stack**: Built with **Bun** for lightning-fast runtime performance and script execution.

## Tech Stack
- **Engine**: Three.js (WebGPU Renderer)
- **Language**: TypeScript / TSL (Three Shading Language)
- **Runtime**: Bun
- **Build Tool**: Vite
- **Icons/OGP**: Sharp (Automated via Bun)

## Setup
```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Generate Favicons & OGP images
bun run icons

# Build for production
bun run build