# Mental Math Shooter — Game Specification

Build a browser-based mental-arithmetic game presented with the visual fantasy of a shooting game.

The core gameplay should have the **continuous rushing feeling of the Chrome Dinosaur game**.

Targets continuously enter from the **right side of the screen** and move horizontally toward the **left side**. Each target contains a mathematical expression.

The player must mentally solve the expression, type the result, and press Enter before the target completely exits the left side of the screen.

A correct answer shoots and destroys the target.

A single mistake ends the run.

---

# Core Fantasy

The player is not aiming manually.

The player's mathematical answer acts as the shot.

The loop should feel like:

```text
TARGET APPROACHES
      ↓
READ EXPRESSION
      ↓
CALCULATE MENTALLY
      ↓
TYPE ANSWER
      ↓
PRESS ENTER
      ↓
BANG
      ↓
TARGET DESTROYED
      ↓
NEXT TARGET ALREADY COMING
```

The game should increasingly create the feeling:

> "I need to solve this before it gets away."

It should **not** feel like a traditional math quiz where a question appears and waits for the player.

The mathematical problem is physically moving toward failure at all times.

---

# Chrome Dinosaur-Style Pacing

The gameplay pacing should take inspiration from Chrome Dinosaur.

Important characteristics:

- continuous motion;
- very little downtime;
- immediate consequences;
- gradually increasing speed;
- simple controls;
- increasingly intense runs;
- immediate restart after failure;
- strong "one more try" feeling.

There should be no visible countdown timer associated with an individual target.

Instead, the player's remaining time is communicated spatially:

```text
RIGHT                                  LEFT
spawn                                   fail
  ↓                                      ↓

        [ 17 + 28 ]  → → → → → → → → →
```

As the target approaches the left edge, the player naturally understands that time is running out.

---

# Target Movement

Every target:

1. Spawns just outside or at the right edge of the gameplay area.
2. Moves continuously from right to left.
3. Displays one mathematical expression.
4. Continues moving while the player thinks and types.
5. Is destroyed immediately when the player submits the correct answer.
6. Causes game over if it completely leaves the left side of the screen.

Movement must never pause while the player is typing.

The target should have a clearly defined bounding box.

A miss occurs only when the **entire target has exited the visible gameplay area on the left**.

For example:

```text
VISIBLE SCREEN
|------------------------------------------|

             [ 35 + 27 ]
                    ← moving left
```

Later:

```text
VISIBLE SCREEN
|------------------------------------------|

[ 35 + 27 ]
←
```

This is still playable.

Later:

```text
          VISIBLE SCREEN
          |------------------------------------------|

[ 35 + 27 ]
```

Once the entire target is outside the left boundary:

```text
GAME OVER
Target escaped
```

---

# Losing Conditions

There are exactly **two losing conditions** in the initial version.

## 1. Wrong answer

If the player presses Enter with an incorrect answer:

```text
Target:
17 + 28

Player submits:
44

Correct answer:
45
```

The run ends immediately.

Do not allow retries.

Do not simply clear the answer and continue.

One wrong submitted answer means game over.

---

## 2. Target escapes

If the target completely leaves the left side of the screen before being destroyed:

```text
GAME OVER
Target escaped
```

The run ends immediately.

There is no independent countdown timer.

Target position itself represents the available response time.

---

# Valid Answers

Every generated expression must have a correct answer that is:

- an integer;
- zero or greater.

Therefore:

```text
0
1
2
17
248
```

are valid possible answers.

These are never valid answers:

```text
-4
-17
2.5
1/3
```

The expression generator must guarantee this property rather than generating expressions and rejecting them afterward whenever possible.

---

# Input

Gameplay should be almost entirely keyboard controlled.

Supported gameplay input:

- `0-9`
- `Backspace`
- `Enter`

Negative input does not need to be supported because correct answers can never be negative.

The answer field should automatically remain focused throughout gameplay.

The user should never need to click the field between targets.

Pressing Enter submits the current answer.

Do **not** automatically fire merely because the currently typed number equals the answer.

For example, if the answer is:

```text
12
```

typing:

```text
1
```

does nothing.

Typing:

```text
12
```

still does nothing.

The player fires only after:

```text
Enter
```

---

# Correct Answer Behavior

When the answer is correct:

1. fire the weapon;
2. play a very short shooting effect;
3. hit the current target;
4. destroy it;
5. increment targets destroyed;
6. clear the input;
7. increase progression;
8. spawn the next target;
9. continue immediately.

The entire transition should be extremely short.

The shooting animation must not pause gameplay for a noticeable amount of time.

The goal is:

```text
solve → Enter → BANG → next
```

not:

```text
solve
→ Enter
→ animation
→ score screen
→ delay
→ next question
```

---

# Continuous Gameplay

Avoid presenting calculations as isolated rounds.

The visual environment should feel continuously active.

After destroying a target, the next target should appear very quickly.

Ideally, there should be a small configurable spawn delay or spacing so that gameplay remains readable while preserving continuous pressure.

Conceptually:

```text
→ → → [TARGET] → → → → → → →

BANG

             → → [NEXT TARGET] → → →
```

The game should never show a modal or intermediate success screen between targets.

---

# Difficulty Progression

Difficulty should increase during the same run through **two independent systems**:

1. mathematical difficulty;
2. target movement speed.

Both reset when a new run starts.

This should create a Chrome Dinosaur-like progression:

```text
beginning:
easy calculations
slow targets

↓ survival

medium calculations
faster targets

↓ survival

hard calculations
even faster targets
```

Difficulty must rise gradually rather than jumping suddenly between completely different experiences.

---

# Mathematical Difficulty

All generated expressions must resolve to non-negative integers.

## Level 1 — Single-digit addition

Examples:

```text
3 + 4
2 + 6
8 + 1
5 + 5
```

---

## Level 2 — Basic subtraction

Only generate subtraction when the result is non-negative.

Valid:

```text
9 - 4
15 - 7
18 - 12
```

Invalid:

```text
4 - 9
7 - 18
```

---

## Level 3 — Larger addition/subtraction

Examples:

```text
27 + 18
63 - 29
46 + 37
91 - 48
```

All subtraction expressions must satisfy:

```text
leftOperand >= rightOperand
```

---

## Level 4 — Basic multiplication

Examples:

```text
6 × 7
8 × 9
12 × 4
11 × 6
```

---

## Level 5 — Integer division

Division may be introduced, but it must **always divide evenly**.

Examples:

```text
56 ÷ 7
72 ÷ 8
81 ÷ 9
48 ÷ 6
```

Never generate:

```text
10 ÷ 4
17 ÷ 3
8 ÷ 0
```

One good generation strategy is:

1. generate the desired integer answer;
2. generate a divisor;
3. multiply them to produce the dividend.

For example:

```text
answer = 8
divisor = 7
dividend = 56

expression = 56 ÷ 7
```

This guarantees an integer result.

---

## Level 6 — Two operations

Examples:

```text
8 + 4 × 6
30 - 7 × 3
6 × 8 + 17
72 ÷ 8 + 13
```

Every generated expression must still resolve to a non-negative integer.

Normal operator precedence applies.

---

## Level 7 — Parentheses

Examples:

```text
(8 + 7) × 3
6 × (14 - 9)
(42 - 18) ÷ 6
(9 + 3) × 7
```

The generator must construct these deliberately so that intermediate operations and the final answer remain valid for mental calculation.

---

## Level 8+ — Mixed arithmetic

Examples:

```text
(18 + 7) × 4 - 13
84 ÷ 7 + 6 × 5
9 × (17 - 12) + 16
(63 - 27) ÷ 6 + 19
```

Continue increasing difficulty through combinations of:

- operand size;
- number of operations;
- multiplication difficulty;
- mental subtraction difficulty;
- operator precedence;
- parentheses.

Do not introduce:

- negative answers;
- fractional answers;
- decimal answers;
- enormous arbitrary numbers.

The game is about **fast mental arithmetic**, not cumbersome written calculation.

---

# Expression Generator

Create a dedicated expression-generation module.

Do not scatter random arithmetic logic throughout UI components.

An expression should conceptually contain:

```ts
interface Expression {
  display: string;
  answer: number;
  difficulty: number;
}
```

The generator must guarantee:

```ts
Number.isInteger(expression.answer) === true
expression.answer >= 0
```

It must also guarantee:

- no division by zero;
- every division resolves to an integer;
- displayed parentheses match actual evaluation;
- operator precedence is correct;
- questions remain suitable for mental calculation;
- difficulty roughly corresponds to the requested level.

Prefer **constructing valid expressions** rather than generating arbitrary expressions and repeatedly retrying until one happens to be valid.

---

# Speed Progression

Target speed should gradually increase as the player survives.

Do not make speed progression dependent only on discrete difficulty levels.

Prefer a continuous model.

Conceptually:

```ts
speed = baseSpeed + progression
```

where progression increases according to something such as:

- survival time;
- targets destroyed;
- or a combination of both.

The speed curve should initially increase slowly.

Longer runs should noticeably feel faster.

However, mathematical difficulty should remain the main challenge.

Do not let movement speed increase until calculations become physically impossible for even a very skilled player.

A configurable maximum speed is acceptable.

---

# Relationship Between Speed and Math Difficulty

Do not increase both too aggressively at exactly the same time.

The progression should feel smooth.

For example:

```text
Targets 1–5
simple math
slow movement

Targets 6–10
slightly harder math
slightly faster movement

Targets 11–20
larger numbers
faster movement

Targets 21–30
multiplication/division
faster movement

Targets 31+
multi-operation expressions
increasingly fast movement
```

These thresholds are examples, not strict requirements.

The important behavior is progressive escalation.

---

# Randomization

Every run must generate a new sequence of calculations.

Do not store a fixed list of questions.

Starting a new game should produce a new randomized sequence while following the same difficulty curve.

Therefore two runs might begin like:

```text
RUN A

4 + 3
8 + 6
12 - 5
...
```

and:

```text
RUN B

2 + 7
5 + 8
14 - 6
...
```

Difficulty progression remains predictable while individual expressions remain unpredictable.

---

# Score

The primary score should be **survival time**, matching the endless-runner inspiration.

Also track:

- targets destroyed;
- current difficulty;
- current target speed;
- personal best survival time;
- optionally, personal best targets destroyed.

The timer starts when gameplay begins and ends immediately on failure.

Persist personal bests using browser local storage.

No backend is required for the MVP.

---

# HUD

Keep the HUD simple.

Display:

```text
TIME       01:42.63
HITS       27
BEST       02:16.91
```

Difficulty information may optionally be displayed, but it should not dominate the interface.

The moving target and its expression should remain the visual focus.

---

# Visual Style

The game should visually combine:

- a minimalist endless runner;
- a shooting-gallery game;
- an arcade score-chasing game.

It does not need realistic FPS graphics.

A 2D side-view presentation is preferred.

Example:

```text
┌─────────────────────────────────────────────────────────────┐
│ TIME 01:22.18                         BEST 02:43.72          │
│                                                             │
│                                      ┌───────────┐          │
│                                      │  37 + 28  │          │
│                                      └───────────┘          │
│                                           ←                 │
│                                                             │
│ 🔫                                                          │
│                                                             │
│                         [ 65 ]                              │
└─────────────────────────────────────────────────────────────┘
```

The expression should be easy to read even while moving.

---

# Shooting Feedback

A correct answer should produce satisfying immediate feedback.

Possible effects:

- muzzle flash;
- projectile/tracer;
- short target hit animation;
- target flash;
- brief particle burst;
- small screen shake;
- short sound effect.

Keep the effect fast.

The player should almost immediately begin reading the next target.

---

# Game Over

When the player submits the wrong answer:

```text
GAME OVER

Wrong answer

37 + 28 = 65
You answered: 64

Time: 01:42.63
Targets destroyed: 27

Best: 02:16.91
```

When the target exits:

```text
GAME OVER

Target escaped

37 + 28 = 65

Time: 01:42.63
Targets destroyed: 27

Best: 02:16.91
```

The player should be able to restart with:

```text
Enter
```

or a Play Again button.

Restart should be nearly instantaneous.

---

# Game States

At minimum:

```text
READY
PLAYING
GAME_OVER
```

Transient animation states may exist internally, but they should not unnecessarily interrupt gameplay.

When a run restarts, reset:

- elapsed time;
- target;
- target position;
- target speed;
- current expression;
- current answer;
- hits;
- difficulty;
- progression;
- animation state.

Do not reset persisted personal-best values.

---

# Architecture

Separate game logic from rendering.

A reasonable structure is:

```text
Game
├── GameArena
├── Target
├── Weapon
├── AnswerInput
├── HUD
├── GameOverScreen
├── expressionGenerator
├── difficultySystem
├── movementSystem
└── gameState
```

The exact implementation should follow the architecture already present in the repository.

If this is an existing project, inspect it before implementing.

Do not introduce unnecessary dependencies.

If starting from an empty project, prefer a straightforward React + TypeScript browser implementation.

---

# Important Implementation Detail: Movement

Target movement should preferably be time-based rather than frame-based.

Do not implement movement as:

```ts
x -= 5;
```

on every frame.

Instead, calculate movement using elapsed frame time:

```ts
x -= speed * deltaTime;
```

This keeps gameplay speed consistent across devices and refresh rates.

Use `requestAnimationFrame` or the appropriate animation/game-loop mechanism.

---

# Tests

Add automated tests for the core non-visual logic.

Especially test the expression generator.

Across large numbers of generated expressions verify:

```ts
Number.isInteger(answer)
answer >= 0
```

Also test:

- no division by zero;
- division always produces integers;
- subtraction never causes invalid final answers;
- generated expression evaluates to its stored answer;
- difficulty progression works;
- speed progression works;
- correct answers destroy targets;
- incorrect answers trigger game over;
- target fully leaving the screen triggers game over;
- target partially outside the screen does NOT trigger game over;
- restarting resets progression;
- personal-best persistence works.

---

# MVP Scope

Prioritize:

1. Continuous right-to-left target movement.
2. Random arithmetic expressions.
3. Non-negative integer answers only.
4. Keyboard answer submission.
5. Correct answer shoots the target.
6. Wrong answer immediately ends the run.
7. Target completely leaving the screen immediately ends the run.
8. Increasing mathematical difficulty.
9. Increasing movement speed.
10. Survival-time scoring.
11. Personal-best persistence.
12. Immediate restart.
13. Satisfying but very short shooting feedback.

Do not prioritize:

- multiplayer;
- accounts;
- online leaderboards;
- elaborate 3D graphics;
- multiple weapons;
- character progression;
- backend infrastructure.

---

# Acceptance Criteria

The MVP is complete when:

1. I can start a run.
2. A target enters from the right side of the screen.
3. The target continuously moves left.
4. The target contains a random arithmetic expression.
5. Every expression has a non-negative integer answer.
6. I can type an answer while the target continues moving.
7. Pressing Enter with the correct result shoots and destroys the target.
8. Another randomized target enters shortly afterward.
9. Pressing Enter with a wrong result immediately ends the run.
10. Allowing the entire target to leave the left side immediately ends the run.
11. A target being only partially outside the screen does not end the run.
12. Mathematical difficulty increases during a successful run.
13. Target speed gradually increases during a successful run.
14. Starting another game resets both speed and mathematical difficulty.
15. A new run produces a different randomized expression sequence.
16. Survival time and targets destroyed are displayed.
17. Personal best survives page refreshes.
18. Gameplay feels continuous and increasingly urgent rather than like a sequence of static math questions.

Before implementing, inspect the existing codebase and briefly plan how the game fits its current architecture. Then implement the MVP end-to-end rather than stopping after scaffolding.