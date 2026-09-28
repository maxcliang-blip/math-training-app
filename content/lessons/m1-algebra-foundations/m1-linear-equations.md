---
id: m1-linear-equations
moduleId: M1
title: Linear Equations and Inequalities
order: 1
tiers: ['10', '12']
estimatedMinutes: 40
lockMode: soft
sections:
  objective: >-
    Solve a linear equation or inequality in one unknown, and decide from the
    coefficient whether an inequality reverses.
  prerequisites: []
  examples:
    - title: Solving a two-step equation
      latex: |-
        $$2x + 3 = 11$$
        Subtract $3$ from both sides: $2x = 8$.
        Divide by $2$: $x = 4$.
        Check: $2(4) + 3 = 11$. Correct.
    - title: An equation that reduces to a fraction
      latex: |-
        $$\frac{x-1}{3} + 2 = 5$$
        Subtract $2$: $\frac{x-1}{3} = 3$.
        Multiply by $3$: $x - 1 = 9$, so $x = 10$.
    - title: An inequality that reverses
      latex: |-
        $$-2x + 6 > 10$$
        Subtract $6$: $-2x > 4$.
        Divide by the negative $-2$ and reverse: $x < -2$.
  techniques:
    - slug: balance-model
      name: Balance model
      summary: >-
        An equation is a balanced scale. Every operation you apply must be applied
        to both sides, so the balance is preserved.
    - slug: reverse-on-negative
      name: Reverse on negative
      summary: >-
        Multiplying or dividing both sides by a negative number flips the
        inequality direction. This is the single most common source of wrong
        answers in this lesson.
    - slug: clear-denominators-first
      name: Clear denominators first
      summary: >-
        When fractions appear, multiply every term by the least common
        denominator before doing anything else. It removes fractions from the
        whole problem at once.
  pitfalls:
    - title: Forgetting to reverse
      wrongLatex: $x > -2$
      why: >-
        Dividing $-2x > 4$ by $-2$ gives $x > -2$, which is false: $x = 0$ does
        not satisfy the original inequality.
      fix: >-
        Dividing by a negative reverses the sign, so the correct answer is
        $x < -2$.
    - title: Only one side is cleared
      wrongLatex: $\frac{x-1}{3} = 3$
      why: >-
        Clearing the denominator means multiplying *every* term by the
        denominator, including the constant on the right.
      fix: Multiply both sides by $3$ at the same time.
  practiceIds:
    - m1-linear-equations-01
    - m1-linear-equations-02
    - m1-linear-equations-03
    - m1-linear-equations-04
    - m1-linear-equations-05
    - m1-linear-equations-06
    - m1-linear-equations-07
    - m1-linear-equations-08
  masteryIds:
    - m1-linear-equations-m1
    - m1-linear-equations-m2
    - m1-linear-equations-m3
---

# Linear Equations and Inequalities

An equation is a statement that two expressions name the same number. Solving
one means isolating the unknown so it stands alone on one side. The interesting
part of this topic is not the arithmetic — it is keeping track of which
operations are *reversible*. Every algebraic step you take must leave the set of
solutions unchanged, and an operation is reversible exactly when you can undo it
without dividing by zero.

Start with the balance model. The equals sign is a two-pan scale: whatever sits
on the left balances whatever sits on the right. Adding, subtracting,
multiplying, or dividing both pans by the same number keeps it balanced, so the
solution set is untouched. That is the only permission you have. Adding $3$ to
the left and then, from a moment of inattention, also to the right is not an
operation at all — it is a different equation with a different answer.

The second habit is clearing denominators before anything else. Fractions are
the main reason people lose track, because an expression like
$\frac{x-1}{3} + 2 = 5$ has three separate terms and only one of them is
already over $3$. Multiplying through by $3$ first turns it into
$x - 1 + 6 = 15$, which is honest arithmetic. Trying to simplify the fractions
in place instead is how people end up solving a different problem.

Inequalities behave identically up to one rule. When you multiply or divide both
sides by a **negative** number, the direction of the inequality reverses. The
reason is geometric: $-1$ points left, so the order of two numbers on a number
line is swapped when you pass them through it. A robust habit is to rewrite every
negative coefficient as a positive one before dividing, for instance turning
$-2x > 4$ into $2x < -4$ and then dividing to get $x < -2$. Students who
remember that the sign *and* the direction both change almost never lose marks
here.

Finally, treat a solution as a claim you can check. Substitute it back. It costs
five seconds and it is the difference between an answer you produced and an
answer you verified. Inequalities have a bonus: check a value in each region of
the solution, and if the two sides compare the same way in both regions you have
found the whole solution set.
