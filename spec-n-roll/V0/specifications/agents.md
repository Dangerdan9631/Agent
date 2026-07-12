Define an extensions folder in the spec-n-roll config dir. All extensions will be loaded from this directory.

In the extensions folder, create an "agents" folder for agent extensions.

Define an agent extension interface. It should have a method for creating skills and one for configuring mcp.

To create skills, the project will pass in a list of skill objects. The skill object will have the configuration values to use for the skill. For now, this is a name, a description and a list of "agent instruction" objects.

Agent instructions are blocks of text that should be inserted sequentially into the generated agent skills.

Create default agent extensions for codex and cursor. The init command should create them.

Each extension gets its own folder in the extension subfolder.

Add an extensions.json config file in the extensions folder. It should contain an entry for each type of extension (e.g. "agents") and that should have a key for each extension of that type. It should have an object that says if it is enabled or not.

The runtime should use the config file to discover extensions (just add the methods for discovery right now. Nothing should actually discover or use the extensions.)