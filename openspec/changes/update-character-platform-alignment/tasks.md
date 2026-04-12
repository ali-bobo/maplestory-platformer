## 1. Specification

- [ ] 1.1 Consolidate existing intent from `GAME_SPEC.md`, `ITERATION5_SPEC.md`, `README.md`, and project rules into OpenSpec project context and positioning spec.
- [ ] 1.2 Record screenshot case A: floating island upper platform player clipping / misalignment against the red baseline.
- [ ] 1.3 Record screenshot case B: ruins ground-level mismatch where NPC, player, and monsters do not share one standing line.
- [ ] 1.4 Record screenshot case C: forest upper platform mismatch where the player appears embedded into the platform instead of standing on it.
- [ ] 1.5 Record official game reference usage rules: compare visible contact and layering, not full-scene pixel matching.
- [ ] 1.6 Add explicit acceptance scenarios for ground, mid-platform, thin-platform, boss-room, and multi-map verification.

## 2. Implementation Direction

- [x] 2.1 Inspect and compare the current standing model for NPC, player, monster, and Boss.
- [x] 2.2 Document why the current formula-based dynamic alignment diverges from the NPC foot-origin model.
- [x] 2.3 List previously attempted fixes and map each one to its failure mode.
- [x] 2.4 Select a single visual foot-baseline model for dynamic entities.
- [x] 2.5 Select explicit per-asset foot-anchor metadata as the source of truth for dynamic alignment values.
- [ ] 2.6 Evaluate partial sprite-size normalization for player and monster assets, and document where it helps and where it does not.
- [ ] 2.7 Reject background-size normalization as a standing-alignment solution unless a direct platform-mapping need is proven.
- [x] 2.8 Ensure spawn placement, post-collider stabilization, and map transitions keep entities on the same platform-top baseline.

## 3. Verification

- [x] 3.1 Validate one representative map first using ground plus at least one upper platform.
- [x] 3.2 Validate that NPC remains the visual reference instead of regressing after dynamic alignment changes.
- [ ] 3.3 Re-run validation across sky, henesys, ruins, ellinia, kerning, and boss maps.
- [ ] 3.4 Confirm that fixing visual foot alignment does not reintroduce portal spawn regressions.
- [x] 3.5 Update OpenSpec tasks and spec wording immediately when a hypothesis is disproven during implementation.

## 4. Execution Breakdown

- [ ] 4.1 Freeze the acceptance baseline before editing code.
- [x] 4.2 Introduce a shared alignment metadata module for Player, Monster, and Boss.
- [x] 4.3 Update dynamic entity constructors to consume shared alignment metadata.
- [x] 4.4 Update BaseMapScene dynamic placement to honor `visualFootPadding` first.
- [ ] 4.5 Update BossScene spawn and summoned minions to use the same placement flow.
- [ ] 4.6 After each code change, capture which symptom improved, which stayed broken, and which new regression appeared.
- [x] 4.7 Keep the change design and delta spec synchronized with the latest verified findings.
