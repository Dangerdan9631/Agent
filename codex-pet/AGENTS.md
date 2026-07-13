# Commander Drone Pet Contribution Guide

This repository is the maintainable source package for the Commander Drone Codex pet.

## Repository layout

- `source/` contains the final individual PNG frames for the nine standard animation rows and all 16 look directions.
    - Each animation has it's own subfolder, and each of those have `robot` and `drone` subfolders that contain the 
      animation frames for each character in isolation.
- `reference/` contains high resolution reference images for different poses and actions that should be used as the
  basis for the final pixel art frames.
- `output/` contains the Codex-installable artifacts: `pet.json` and `spritesheet.webp`.
- `build.ps1` rebuilds the sprite atlas from `source/` using the installed hatch-pet assembly scripts.
- `install.ps1` copies `output/` to `%USERPROFILE%\.codex\pets\commander-drone`.
- `preview/` is a dependency-free browser preview application that reads frames directly from `source/`.
- `run-preview.ps1` opens the preview application in the default browser.

## Image editing

When editing the images, always reference the character style guide below, and the high resolution reference images in 
`reference`. Generate the animations for the robot and drone separately, and then combine them in the final output, 
adding any additional effects or overlays needed to ensure a cohesive final animation. The drone should always be 
layered behind the robot, and the two should maintain a consistent relative scale across all frames and animations. 
The drone should also maintain a consistent placement relative to the robot, and should not abruptly grow, shrink, 
disappear, or swap sides without an intentional state-specific reason.

## Character style guide

### Character identity

Commander Drone is a compact, ruthless coding mech accompanied by a small spherical scout drone. The mech is precise, relentless, and intimidating: an unstoppable machine built to execute work, not a friendly mascot. The paired drone must be present in every frame and always be layered behind the robot; it is a core part of the character's silhouette, motion, and personality.

The mech has a broad armored upper body, sturdy planted legs, articulated black joints, clenched mechanical hands, a narrow cyan visor, and two long swept antennae/horns. Its bright circular chest reactor is the main focal point. The scout is a cream-and-black orb with a single cyan eye, rear thruster, and orbital ring. The ring hangs beneath the drone and responds with a subtle, delayed bouncy swing to changes in the drone's motion.

### Visual language

- Use detailed retro sprite art with crisp pixel clusters, chunky readable shapes, and deliberately stepped edges; do not replace it with smooth vector, painterly, or flat-cartoon rendering.
- Preserve the warm ivory/cream armor plates, near-black mechanical structure, vivid cyan energy lights, and subtle magenta rim outline. Small red lights are reserved for an error or failure state.
- Armor should feel layered, weighty, and engineered: visible panel seams, dark joints, mechanical knuckles, and modest edge wear are welcome, but details must remain legible at pet size.
- Cyan elements should read as emissive: visor, chest reactor, limb insets, and the drone eye are the visual anchors. Keep their glow sharp and contained rather than soft, hazy, or screen-filling.
- Use transparent backgrounds. Avoid scenery, ground planes, cast shadows, labels, UI text, or unrelated floating decoration.

### Composition and framing

- Keep the full character inside the frame with a stable visual baseline. The mech should occupy most of the height while retaining breathing room for antennae, fists, feet, and the drone.
- Unless the animation is specifically directional, use a neutral three-quarter stance facing screen-left, with the drone hovering behind the robot on the left side of the frame. Keep it behind the robot in every pose, including action poses.
- Maintain a single consistent drone scale across all frames and animations, as well as stable relative scale, registration, and placement for the mech. Do not let either abruptly grow, shrink, disappear, or swap sides without an intentional state-specific reason.
- Anchor planted feet consistently on the ground across frames. For airborne movement, use a smooth, intentional arc with stable body registration rather than frame-to-frame jumps or drifting.
- Make every frame readable at a small size: prioritize silhouette, face direction, chest light, arm pose, and drone placement over tiny new surface details.

### Animation direction

- Animate with deliberate mechanical weight: short arcs, articulated limb changes, small body compression, and controlled follow-through. Avoid rubbery deformation, floaty motion, or large camera-like scale changes. The drone's orbital ring should lag its movement by a small, springy swing rather than remaining rigidly locked in place.
- `idle` is a threatening, ready-to-execute stance: subtle breathing, visor/reactor-light variation, a small head shift, and restrained scout hover are appropriate.
- `running-right` and `running-left` are airborne, high-speed flight animations, not a foot-running gait. Show powerful cyan thruster blasts from the mech's back and legs, while the drone's rear thruster visibly drives and pushes the pair through the air. Make `running-left` an exact horizontal mirror of `running-right`, preserving frame order and timing.
- `waving` is a confident greeting or activation beat. The raised-arm gesture should remain clear; attached electric or energy accents may reinforce the command aesthetic without obscuring the silhouette.
- `jumping` is a powerful launch or landing pose driven by cyan thruster blasts from the mech's back and legs, with the drone assisting from behind. Use a smooth vertical arc and controlled airborne registration; show the action through pose and propulsion rather than a floor effect.
- `failed` is visibly de-energized: lower the posture, dim or shift key lights toward red, and make the scout's state support the setback without turning the character grim or damaged beyond recognition.
- `waiting` should communicate patient readiness or a request for input, such as a composed stance, clasped hands, slight head tilt, or attentive drone position.
- `running` represents relentless active work rather than literal locomotion. Use a focused, purposeful coding or scanning action while keeping the three-quarter screen-left identity pose recognizable.
- `review` is deliberate analysis: a slight lean, concentrated visor, and an optional hard-edged holographic panel or scan construct can frame the action. Keep props attached to the composition and avoid readable text.

### Look directions

The look-direction frames should form one smooth clockwise attention loop. Keep the body anchored and use the helmet/visor, antennae, torso angle, and scout orientation to make each direction legible. `000` reads upward, `090` screen-right, `180` downward, and `270` screen-left; diagonals must interpolate naturally. Do not fake the sequence by rotating the entire sprite or by moving only the visor while the rest of the mech remains neutral.
