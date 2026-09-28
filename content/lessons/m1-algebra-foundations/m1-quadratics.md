---
id: m1-quadratics
moduleId: M1
title: Quadratic Equations and the Discriminant
order: 2
tiers: ['10', '12']
estimatedMinutes: 45
lockMode: soft
sections:
  objective: >-
    Solve a quadratic equation by factoring, completing the square, or the
    quadratic formula, and predict the number of real roots from the
    discriminant.
  prerequisites:
    - m1-linear-equations
  examples:
    - title: Factoring when the numbers are friendly
      latex: |-
        $$x^2 - 5x + 6 = 0$$
        We need two numbers with product $6$ and sum $-5$: these are $-2$ and $-3$.
        $$(x-2)(x-3) = 0$$
        So $x = 2$ or $x = 3$.
    - title: Completing the square
      latex: |-
        $$x^2 + 6x = 7$$
        Add $\bigl(\tfrac{6}{2}\bigr)^2 = 9$ to both sides:
        $$x^2 + 6x + 9 = 16$$
        $$(x+3)^2 = 16 \implies x = 1 \text{ or } x = -7$$
    - title: Reading the roots off the discriminant
      latex: |-
        For $2x^2 - 4x - 1 = 0$ we have $a=2$, $b=-4$, $c=-1$:
        $$\Delta = b^2 - 4ac = 16 + 8 = 24$$
        $\Delta > 0$, so two distinct real roots, and the formula gives
        $x = \frac{4 \pm \sqrt{24}}{4} = 1 \pm \frac{\sqrt{6}}{2}$.
  techniques:
    - slug: split-the-middle
      name: Split the middle term
      summary: >-
        For $x^2 + bx + c$, find two numbers with product $c$ and sum $b$, then
        rewrite the middle term using them. This is the mechanical version of
        factoring and it never fails on integers.
    - slug: complete-the-square
      name: Complete the square
      summary: >-
        Add $\bigl(\tfrac{b}{2a}\bigr)^2$ to both sides so the left side becomes
        a perfect square. This is the method that also handles the conics in
        analytic geometry.
    - slug: discriminant-counts-roots
      name: The discriminant counts roots
      summary: >-
        $\Delta = b^2 - 4ac$ is positive for two real roots, zero for one
        repeated root, and negative for none. Check it before computing roots.
    - slug: substitute-one-to-solve
      name: Substitute one to solve
      summary: >-
        For equations in two variables, solve the linear one for a variable and
        substitute it into the other. A quadratic in the remaining variable
        usually results.
  pitfalls:
    - title: Forgetting both roots
      wrongLatex: 'x = 2'
      why: >-
        Factoring gives a product equal to zero, so one factor is zero. Both
        factors must be set to zero in turn.
      fix: Always write $(x-2)(x-3) = 0$ and split it into two equations.
    - title: Dropping the denominator in the formula
      wrongLatex: 'x = \frac{-b \pm \sqrt{\Delta}}{2}'
      why: >-
        The quadratic formula divides by $2a$, not by $2$. Dropping the $a$
        silently gives wrong answers for every non-monic quadratic.
      fix: $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$, and check $a \ne 0$ first.
  practiceIds:
    - m1-quadratics-01
    - m1-quadratics-02
    - m1-quadratics-03
    - m1-quadratics-04
    - m1-quadratics-05
    - m1-quadratics-06
    - m1-quadratics-07
    - m1-quadratics-08
  masteryIds:
    - m1-quadratics-m1
    - m1-quadratics-m2
    - m1-quadratics-m3
---

# Quadratic Equations and the Discriminant

A quadratic equation in one unknown is any equation that can be written
$ax^2 + bx + c = 0$ with $a \ne 0$. The word *any* matters: rearranging terms
and using a different variable can turn a surprising number of problems into
this shape, and recognising that shape is most of the skill.

Three methods cover everything. Factoring is fastest when it works, and it works
whenever the discriminant is a perfect square, which is common on AMC-10 and
AMC-12. Completing the square is the method that generalises; it is what turns a
quadratic into a circle or a parabola later on. The quadratic formula always
works and almost never needs to be memorised as a formula, because it falls out
of completing the square in two lines. Learn the method that explains the others
and the formula becomes unnecessary.

The discriminant $\Delta = b^2 - 4ac$ is the single most useful object in this
topic. It is the part of the formula under the square root, so its sign tells
you how many real roots exist before you compute any: positive means two distinct
real roots, zero means one repeated root, negative means no real roots. On
multiple choice this saves a lot of time — you can often eliminate four answers
without solving anything. It is also a genuine proof device: a standard move in
inequality problems is to arrange an expression as $\Delta \ge 0$.

Watch the denominator. The quadratic formula is
$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$, and the $a$ in the denominator is the
most commonly dropped symbol in competition mathematics. If you are solving
$2x^2 - 5x + 1 = 0$ and get $\frac{5 \pm \sqrt{17}}{2}$, you have lost the factor
of $2$. A reliable guard is to substitute your answer back into the original
equation, which takes three seconds and catches every instance of this error.

When a problem has two unknowns, do not reach for symmetry arguments first.
Solve the simpler equation for one variable, substitute, and let the quadratic
machinery do its work. Symmetry is the elegant move, and elegance is not what
the answer field rewards.
