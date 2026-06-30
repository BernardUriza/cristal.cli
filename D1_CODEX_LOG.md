# D1 Codex Audit Log

## D1.1 RoomPressureController
- SHA: 9342bb7e758ce5de0fa5c01ad693d01c264fe76c
- Files: web/src/game/RoomPressureController.ts, web/src/game/RoomPressureController.test.ts, web/src/game/store.ts, web/src/game/RoomScene.tsx, web/src/ui/ConsoleOverlay.tsx, web/src/App.tsx
- Public API: resolveRoomPressureAtmosphere(input), RoomPressureAtmosphere, GameState.psychologicalPressure, GameState.setPsychologicalPressure()
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 13 files / 75 tests
- Architecture notes: pressure remains sourced from StancePressureTracker; ConsoleOverlay mirrors it into the existing game store; RoomScene consumes pure atmosphere output for fog, light instability, wall pulse, portal glow, ambient color; App renders the screen-space vignette adapter.
- Breaking changes: none

## D1.2 FalseDoorConsequences
- SHA: 82d895aec9e334458c905547e6a0d3fed8e58c9b
- Files: web/src/game/FalseDoorConsequences.ts, web/src/game/FalseDoorConsequences.test.ts, web/src/game/store.ts, web/src/game/RoomScene.tsx, web/src/App.tsx, web/src/ui/RoomCaption.tsx, web/src/terminal/psych/PsychologicalResponseEngine.ts
- Public API: resolveFalseDoorConsequences(event), FalseDoorConsequence, FalseDoorAnnotation, recordEnvironmentalDeflection(), GameState.roomPressureSpike, GameState.falseDoorAnnotations, GameState.lastRoomWhisper
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 14 files / 78 tests
- Architecture notes: false-door logic remains in the existing takeExit branch; the pure consequence resolver provides deflection intent, atmosphere spike, annotation, and whisper; the existing StancePressureTracker records the deflection through a terminal adapter; RoomScene and vignette consume base pressure plus decaying spike.
- Breaking changes: none

## D1.3 SafeExitResolver
- SHA: e5d5eb2993a93acbc2f8a44516c91c1981594859
- Files: web/src/game/SafeExitResolver.ts, web/src/game/SafeExitResolver.test.ts, web/src/game/store.ts, web/src/game/RoomScene.tsx, web/src/ui/ConsoleOverlay.tsx, web/src/ui/RoomCaption.tsx
- Public API: resolveSafeExit(input), SafeExit, GameState.psychologicalStance
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 15 files / 82 tests
- Architecture notes: confession stance is mirrored into the existing game store beside pressure; SafeExitResolver is reused by RoomScene, RoomCaption, and store.takeExit so the subtle extra door is real topology; safe exits use stable warmer portal behavior and deterministic seeds.
- Breaking changes: none

## D1.4 EmotionalHistory
- SHA: 57f3033d25b7f1727b14a08132e8763a2d70480a
- Files: web/src/game/EmotionalHistory.ts, web/src/game/EmotionalHistory.test.ts, web/src/game/store.ts, web/src/ui/RoomJournal.tsx
- Public API: appendEmotionalHistory(history, entry, limit), summarizeEmotionalHistory(history), EmotionalHistoryEntry, EmotionalHistorySummary, GameState.emotionalHistory
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 16 files / 86 tests
- Architecture notes: emotional history is pure and bounded; store appends room-linked stance/pressure entries when pressure changes, false doors fire, or rooms load with a known stance; RoomJournal consumes the summary so history answers the emotional pattern in the UI.
- Breaking changes: none

## D1.5 PressureEnding
- SHA: e2a1e675bd362cb5d41e7e36a9e3fa86622c0534
- Files: web/src/game/PressureEnding.ts, web/src/game/PressureEnding.test.ts, web/src/game/store.ts, web/src/game/RoomScene.tsx, web/src/App.tsx, web/src/ui/RoomCaption.tsx
- Public API: resolvePressureEnding(input), pressureEndingComplete(ending, now), PressureEndingState, GameState.pressureEnding
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 17 files / 89 tests
- Architecture notes: full pressure becomes a short surrender state; stability drain pauses, room pressure visuals resolve to calm, one sentence is surfaced in RoomCaption, and the existing dismissRoom path returns the player to the maze after the sequence.
- Breaking changes: none

## D1.A AdaptiveWorldProfile
- SHA: 6d85a8985854c31741888d1bfc06a61a817a7d64
- Files: web/src/game/AdaptiveWorldProfile.ts, web/src/game/AdaptiveWorldProfile.test.ts, web/src/ui/RoomJournal.tsx
- Public API: buildAdaptiveWorldProfile(input), AdaptiveWorldProfile, WorldPersonality
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 18 files / 93 tests
- Architecture notes: profile synthesis is pure and derives favorite stance, average pressure, confession ratio, false-door ratio, average room depth, and personality from existing histories; RoomJournal consumes it without adding global state.
- Breaking changes: none

## D1.B MicroMirrorGenerator
- SHA: 9d4a5a89d9d1c3d570fa91c0082ac620f6e4e365
- Files: web/src/game/MicroMirrorGenerator.ts, web/src/game/MicroMirrorGenerator.test.ts, web/src/game/RoomScene.tsx, web/src/ui/RoomCaption.tsx
- Public API: generateMicroMirrors(input), MicroMirrors
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 19 files / 97 tests
- Architecture notes: generated mirrors consume existing emotional history and false-door annotations; repeated intellectualization changes door labels to clinical IDs, repeated confession softens room names, and repeated false doors add subtle blocked corridor hints without adding traversal state.
- Breaking changes: none

## D1.C SilenceEngine
- SHA: 0a6abd61008935160e456f01799a8811163fd246
- Files: web/src/terminal/psych/SilenceEngine.ts, web/src/terminal/psych/SilenceEngine.test.ts, web/src/terminal/types.ts, web/src/terminal/terminalCore.ts, web/src/ui/ConsoleOverlay.tsx
- Public API: createInitialSilenceState(), advanceSilence(state, event), applySilencePolicy(lines, policy), SilenceState, SilencePolicy, TerminalResponse.delayMs
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 20 files / 101 tests
- Architecture notes: SilenceEngine is a pure reducer over stance and pressure movement; TerminalCore applies it only to psychological replies; ConsoleOverlay shows the player's echo immediately and delays/trims CRISTAL's answer, eventually rendering only "...".
- Breaking changes: TerminalResponse gained optional delayMs; existing consumers remain compatible.

## F1 Room Contract Coercion
- SHA: 8ad6eca
- Files: web/src/game/roomApi.ts, web/src/game/roomApi.test.ts
- What changed: generateRoom now returns RoomContractValidator.coerceRoom(await res.json(), params.seed) and no longer maintains duplicate shape normalization that could return undefined for negative seeds.
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 21 files / 102 tests
- Test added: generateRoom coerces malformed server JSON and produces a valid deterministic fallback shape for a negative seed.

## F2 Pressure Ending On Room Entry
- SHA: 85d5b2f
- Files: web/src/game/store.ts, web/src/game/store.test.ts
- What changed: both cached and freshly generated loadRoom branches now resolve a pressure ending when the player enters a room with psychologicalPressure >= 1 and no existing ending.
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 22 files / 104 tests
- Test added: full pressure reached in the maze starts the pressure ending after entering a fresh room and after entering a cached room.

## F3 Shared Pressure And Stance Utilities
- SHA: c79fdc1
- Files: web/src/shared/math.ts, web/src/shared/math.test.ts, web/src/terminal/psych/stanceUtils.ts, web/src/terminal/psych/stanceUtils.test.ts, web/src/game/RoomPressureController.ts, web/src/game/FalseDoorConsequences.ts, web/src/game/SafeExitResolver.ts, web/src/game/EmotionalHistory.ts, web/src/game/AdaptiveWorldProfile.ts, web/src/game/store.ts, web/src/terminal/psych/SilenceEngine.ts, web/src/terminal/psych/StanceClassifier.ts, web/src/terminal/psych/StancePressureTracker.ts, web/src/terminal/responseEngine.ts
- What changed: centralized 0-1 normalization in clamp01 and centralized evasive stance membership in EVASIVE_STANCES/isEvasiveStance; D1 pressure consumers and terminal score clamps now use the shared helper.
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 24 files / 106 tests
- Tests added: clamp01 normalizes finite and non-finite values; evasive stance membership is locked to the shared stance contract.

## F4 False-Door Contract And Normalized Pressure Setter
- SHA: 199ea32
- Files: web/src/game/store.ts, web/src/game/store.test.ts, web/src/terminal/psych/PsychologicalResponseEngine.ts
- What changed: false-door traversal now records consequence.pressureStance through the psych tracker, zustand stance mirror, and emotional history; setPsychologicalPressure computes normalizedPressure once and uses it for store state, pressure-ending resolution, and history.
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 24 files / 108 tests
- Tests added: normalized high pressure stores history pressure 1 and triggers the ending; false-door traversal records stance from the consequence contract and appends the false-door annotation.

## F5 Exhaustive Archetype Switch And Scale Comment
- SHA: 10fa0bf
- Files: web/src/game/glyphSvg.ts, web/src/game/glyphSvg.test.ts, web/src/game/store.ts
- What changed: glyph rendering now has explicit cases for all seven SymbolicArchetype values plus an assertNever default; the pressure ending comment now describes the 0-1 scale.
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 25 files / 109 tests
- Test added: generateGlyphSvg renders every current symbolic archetype.

## F6 Shared Room D1 Derivations
- SHA: 3c58a3b
- Files: web/src/game/RoomD1Derivations.ts, web/src/game/RoomD1Derivations.test.ts, web/src/game/RoomScene.tsx, web/src/ui/RoomCaption.tsx
- What changed: safe-exit and micro-mirror derivation now flows through deriveRoomD1Results; RoomScene computes it once and passes it to the controller, while RoomCaption uses the same helper for HUD text.
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 26 files / 111 tests
- Tests added: deriveRoomD1Results returns aligned safe-exit and micro-mirror results from one input shape and returns empty derivations without a room.

## F7 Backrooms Furniture Layer
- SHAs: efaafe8af01f61e2da5cef604d05e4e55d0f9876, 085b2fd5d2f3dace2c87cffd491015f0443ce25c
- Files: web/src/game/backroomFurniture.ts, web/src/game/BackroomFurniture.tsx, web/src/game/BackroomFurniturePlacer.ts, web/src/game/BackroomFurniturePlacer.test.ts, web/src/game/Scene.tsx
- What changed: added a pure backrooms furniture registry, a procedural Three.js renderer for fourteen liminal office furniture types, and a deterministic maze placer that reserves non-node cells and renders furniture against closed walls.
- Public API: BACKROOM_FURNITURE, BACKROOM_FURNITURE_KINDS, BackroomFurnitureKind, backroomFurnitureByKind(kind), BackroomFurniture, placeBackroomFurniture(maze, seed, blockedCells)
- Typecheck: `npx tsc -b --noEmit` clean after both commits
- Vitest: `npx vitest run` clean after both commits, 27 files / 113 tests
- Coverage test: BackroomFurniturePlacer production-seed test asserts the placed kind set equals the full BACKROOM_FURNITURE_KINDS registry, and same seed plus blocked cells returns identical placements.

## Skipped By Design
- Pressure ownership centralization between zustand psychologicalPressure and StancePressureTracker was not attempted; that remains architectural. TerminalCore.reset() already calls resetPsychSession(), but resetting the zustand mirror there would introduce a terminal-to-game dependency, so it was left untouched.
- Color/palette SSOT for #7dffd0 and PHOSPHOR #39ff14 was intentionally left for a dedicated low-priority sweep.

## D2 Persistent Transference - Pure Modules

### D2.1 PersistentTransference
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/PersistentTransference.ts, web/src/game/PersistentTransference.test.ts
- Public API: createPersistentTransference(storage), load(), save(profile), mergeSession(session), getTransference(), reset(), TransferenceProfile
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: the labyrinth now carries a bounded, weighted memory of habitual defense, confession, avoidance, pressure, depth, ritual, silence, and exploration style across sessions.

### D2.2 WorldBehaviorResolver
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/WorldBehaviorResolver.ts, web/src/game/WorldBehaviorResolver.test.ts
- Public API: resolveWorldBehavior(profile, room, pressure), WorldBehavior
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: the world can now vary abstract behavior for different long-term player patterns without touching rendering.

### D2.3 RelationshipTracker
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/RelationshipTracker.ts, web/src/game/RelationshipTracker.test.ts
- Public API: RelationshipTracker.recordInteraction(), snapshot(), serialize(), deserializeRelationship(serialized), RelationshipSnapshot
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: trust, resistance, curiosity, avoidance, and ritual depth now move slowly as relationship curves, not score or morality.

### D2.4 MemoryEchoEngine
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/MemoryEchoEngine.ts, web/src/game/MemoryEchoEngine.test.ts
- Public API: generateMemoryEchoes(input), EchoFragment
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: repeated behavior becomes compressed echoes such as changed answers, remembered silence, ritual recurrence, and learned refusal without replaying exact logs.

### D2.5 IdentityDrift
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/IdentityDrift.ts, web/src/game/IdentityDrift.test.ts
- Public API: IdentityDrift.currentIdentity(), update(input), snapshot(), PlayerIdentity
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: the terminal can gradually address the player as You, Visitor, Witness, and My oldest recursion from accumulated continuity, never as a scripted jump.

### D2.A EmotionalSeason
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/EmotionalSeason.ts, web/src/game/EmotionalSeason.test.ts
- Public API: resolveEmotionalSeason(input), EmotionalSeasonState
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: the labyrinth now has abstract emotional climates - Dormant, Listening, Observing, Resisting, Accepting - derived from relationship, profile, and pressure history.

### D2.B RitualGravity
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/RitualGravity.ts, web/src/game/RitualGravity.test.ts
- Public API: resolveRitualGravity(input), RitualGravity
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: repeated symbolic behaviors now create small future-generation bias, such as moon toward reflection and gate toward thresholds, without deterministic repetition.

### D2.C AbsencePlanner
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/AbsencePlanner.ts, web/src/game/AbsencePlanner.test.ts
- Public API: planAbsence(input), AbsencePlan, AbsencePlanItem
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: the world can now communicate by deterministic, explainable omissions of consoles, glyphs, or sentences.

### D2.D NarrativeCompression
- SHA: RED - commit blocked; sandbox has read-only `.git` and `git commit` failed creating `.git/index.lock`.
- Files: web/src/game/NarrativeCompression.ts, web/src/game/NarrativeCompression.test.ts
- Public API: compressNarrative(input)
- Typecheck: `npx tsc -b --noEmit` clean
- Vitest: `npx vitest run` clean, 36 files / 140 tests
- Relationship change: hundreds of interactions can now compress into one reflective paragraph about how the player protected, explained, confessed, or ritualized.
