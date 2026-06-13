/speckit-specify new Spec

The ink CLI app should show different options based on whether it's running as the local or global instance.

Use the following rules for how the content area of each screen should be populated:
- ** indicates that the text should be bolded.
- < | > indicate the possible options to show
- { } describes the value to show
- Do not include the // comment text in the actual output.
- Other text should be used literally

## Global
### Home screen
- The content area on the home screen should always show this information, regardless of which option is selected.
```
**Install Source:** <Remote | Local ({path to project dir})>
**Version:** v{version number} (global)
**Latest Version:** <Up to date | v{version number}> // If install source is remote, check if NPM registry has a new version and show the new version number. If local, check if the source package.json version is different and show the new version number. If they are the same, show "Up to date".

**Project**: {Root directory of the project} // Attempt to detect an existing project root using the CLI tree walk logic from the current working directory. Otherwise, use the current working directory.
**Project Status**: <Initialized | Not initialized> // Check if the detected project root has been initialized with the toolkit.
```

`1 Update Spec N' Roll - Update the global Spec N' Roll installation`
- When the package cli is built, it should create a local file that indicates the absolute path to the source package.json. This should not be included in the npm package, but when `npm link`ing the package, it should be able to find it. When updating from the global instance, it should look for that file, if it finds it it should `npm run build` in that directory, then reload. When it cannot find it, it should npm install -g the latest version of the package, then reload.
- When the install source is Remote, this option is disabled when the version is up to date.
- When the install source is local, this option is always enabled.

`2 Init Project - Initialize Spec N' Roll in the current project`
- This should run the init workflow in the current working directory.

`3 Remove Spec N' Roll - Remove Spec N' Roll and configuration from the current project`
- This is new functionality that will also need to be added to the non-interactive CLI. When selected it should remove the project installation of spec-n-roll and all spec-n-roll managed files. This should confirm with the user before proceeding.
- This is only enabled when the project is initialized.

`4 Re-install Spec N' Roll - Remove and re-initialize Spec N' Roll in the current project`
- This should remove spec-n-roll from the project, and then re-run the init workflow.
- This is only enabled when the project is initialized.

`5 Quit`
- This should exit the CLI app.

## Local
### Home screen
- The content area on the home screen should always show this information, regardless of which option is selected.
```
**Version:** v{version number} (local)
**Latest Version:** <Up to date | v{version number}> // Compare this to the package version of the global install, If the global install is newer, show the global install version. If they are the same, show "Up to date".

**Project**: {Root directory of the project} // Detect the existing project root using the CLI tree walk logic from the current working directory.
```
`1 Project - Manage project configuration and specifications`

// In addition to the other content in the homescreen content area, add the following information. There should be a blank line between the existing content and the new content.
```
**Next task spec id:** {nextTaskSpecId from project-metadata.json}
**Updated at:** {HH:mm:ss YYYY-MM-DD timestamp from project-metadata.json}
```

If the current task exists and has not been completed, add this information to the content area with a blank line:
```
**Current task:** {current task ID} {current task title} // use the Title Cased version of the slug for the title.
**Created at:** {createdAt from project-metadata.json}
**Implementation started at:** {HH:mm:ss YYYY-MM-DD timestamp from project-metadata.json} // Omit this line if the current task has not started implementation or has already completed implementation.
```

Implementation started at and Created at should be read from the task spec metadata file, not the project metadata file. They are tasks specific attributes and should be removed from the project metadata file if they are currently there. Create them in the task spec metadata and add the logic to populate them if it doesn't exist.

When selected, open the new project screen defined below

`2 Agents - Manage project agent configurations`

When selected, open the existing agents screen

`3 Workflows - Manage project workflows`

When selected, open the existing workflows screen

`4 Extensions - Manage project extensions`

This is a stub option for now. It should always be disabled.

`5 Manage Spec N' Roll - Manage the Local Spec N' Roll installation`
- When selected, open the manage screen.

`6 Quit`
- When selected, exit the CLI app. No confirmation.

### Project
This is the new project screen. The old project screen should be renamed to project metadata.

I'm not sure exactly what I want the content to look like here. It should show details about the project metadata, and specifications that been defined. Probably the most recent spec, it's status, and the total number of specifications in each state. Are there more details that would be useful? Timestamps? Actions the user can take?

`1 Specs - Manage project specifications`
- When selected, open the existing task specs screen

`2 Project Metadata - Manage project metadata`
- When selected, open the existing project metadata screen

`3 Back`

### Manage Screen
- The content area on the manage screen should always show this information, regardless of which option is selected.
```
**Version:** v{version number} (local)

**Latest Version:** <Up to date | v{version number}> // Compare this to the package version of the global install, If the global install is newer, show the global install version. If they are the same, show "Up to date".

**Project**: {Root directory of the project} // Detect the existing project root using the CLI tree walk logic from the current working directory.
```
`1 Update Spec N' Roll - Update the local Spec N' Roll binary installation`
- This should copy the global installation of the spec n roll binary files to the local project directory overwriting the local installation, then reload.
- This does not affect project metadata or configuration files, only the binary that is run.
- This is disabled when the global version is up to date with the local version.

`2 Upgrade Project - Update the local project installation and configuration`
- This should run the update workflow which will update the local binary, refresh MCP server paths in all configured agents, migrate configs, and show warnings for any extension version incompatibilities.

`3 Remove Spec N' Roll - Remove Spec N' Roll and configuration from the current project`
- Remove the project installation of spec-n-roll and all spec-n-roll managed files. This should confirm with the user before proceeding.
- This is only enabled when the project is initialized.

`4 Re-install Spec N' Roll - Remove and re-initialize Spec N' Roll in the current project`
- This should remove spec-n-roll from the project, and then re-run the init workflow.
- This is only enabled when the project is initialized.

`5 Back`
- This should return to the home screen.

## Other changes
Each existing a new page should have a last option for "Back" that returns the user to the previous screen. The home screen should have "Quit" instead.

The `q` key to quit should need to be pressed twice to prevent accidental exits. The first time it is pressed, show a confirmation message "Press q again to quit". If `q` is pressed again within 3 seconds, quit the app. If any other key is pressed, or if 3 seconds pass without `q` being pressed again, cancel the quit action and return to the previous state.

On the home screen, the `esc` key should also trigger the quit action with the same confirmation behavior as `q`.