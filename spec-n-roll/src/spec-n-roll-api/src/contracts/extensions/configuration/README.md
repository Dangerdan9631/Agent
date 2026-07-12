# Extension configuration contracts

This directory contains the persisted enabled-state model for extensions. It describes the JSON data shape without deciding where it is stored or how extensions are loaded.

## Conventions

### Registration state

Keep configuration focused on durable registration and enabled state. Discovery and extension execution are owned by runtime layers.
