# Source

## Purpose

This directory contains Atlas production code grouped by architectural layer. The composition layer is the only place that connects concrete infrastructure implementations to application behavior.

## Conventions

- Application code depends only on local interfaces and immutable models.
- Infrastructure adapts Node.js and third-party libraries behind those interfaces.
- Presentation translates command-line input into application requests and writes results through the output boundary.

## Contents

- `application/` contains workflows, policies, graph models, and ports.
- `infrastructure/` contains concrete runtime adapters.
- `presentation/` contains the executable command-line boundary.
- `composition/` contains dependency wiring.
