// Full-screen "toy" modes (lasers on black, strings on white) for the cat.
// Each actor follows a scripted list of steps: move to a point, or hold (hover with a small jitter).
// Passing, lingering, feinting and darting are just different ways of building that list.
(function () {
    const rand = (a, b) => a + Math.random() * (b - a);
    const randInt = (a, b) => Math.floor(rand(a, b + 1));
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const EASE = {
        linear: t => t,
        inOut: t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
        out: t => 1 - Math.pow(1 - t, 3),
        dash: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) // explosive start, soft landing
    };

    // ---- Step builders -------------------------------------------------------------------------

    // opts: dur (s) or speed (px/s), ease, wave {amp, freq} (sinusoidal sideways wobble)
    const go = (p, opts) => Object.assign({ x: p.x, y: p.y, ease: 'inOut', dur: 0.5 }, opts);
    const stay = (dur, amp) => ({ hold: dur, amp: amp || 0 });

    // side: 0 top, 1 right, 2 bottom, 3 left; f: position along that edge (0..1)
    function outside(env, side, f) {
        const { w, h, m } = env;
        if (side === 0) return { x: f * w, y: -m };
        if (side === 1) return { x: w + m, y: f * h };
        if (side === 2) return { x: f * w, y: h + m };
        return { x: -m, y: f * h };
    }

    const INWARD = [{ x: 0, y: 1 }, { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }];

    function inside(env, pad) {
        pad = pad === undefined ? 0.12 : pad;
        return { x: rand(env.w * pad, env.w * (1 - pad)), y: rand(env.h * pad, env.h * (1 - pad)) };
    }

    function near(env, p, min, max) {
        const angle = rand(0, Math.PI * 2);
        const d = rand(min, max);
        return {
            x: clamp(p.x + Math.cos(angle) * d, env.w * 0.04, env.w * 0.96),
            y: clamp(p.y + Math.sin(angle) * d, env.h * 0.04, env.h * 0.96)
        };
    }

    function randomExit(env) {
        return outside(env, randInt(0, 3), Math.random());
    }

    // ---- Behaviors: each returns { start, steps } ----------------------------------------------

    const BEHAVIORS = {
        // Crosses the screen in one go, sometimes in a wavy line.
        pass(env, o) {
            o = o || {};
            const side = o.side !== undefined ? o.side : randInt(0, 3);
            const roll = Math.random();
            const other = roll < 0.7 ? (side + 2) % 4 : (side + (roll < 0.85 ? 1 : 3)) % 4;
            const wave = Math.random() < 0.5 ? { amp: rand(20, 120), freq: rand(1, 3) } : undefined;
            return {
                start: outside(env, side, o.f !== undefined ? o.f : Math.random()),
                steps: [go(outside(env, other, Math.random()), { dur: rand(0.7, 1.8), ease: 'linear', wave })]
            };
        },

        // Comes in, stops somewhere and stays a while, then leaves.
        linger(env) {
            const side = randInt(0, 3);
            return {
                start: outside(env, side, Math.random()),
                steps: [
                    go(inside(env, 0.15), { speed: env.v, ease: 'out' }),
                    stay(rand(2, 6), rand(2, 10)),
                    go(randomExit(env), { speed: env.v * 0.8 })
                ]
            };
        },

        // Stops, dashes aside, fakes a move in one direction, then goes back.
        feint(env) {
            const side = randInt(0, 3);
            const a = inside(env);
            const b = near(env, a, 150, 400);
            const c = near(env, b, 100, 300);
            const fake = { x: lerp(b.x, c.x, 0.6), y: lerp(b.y, c.y, 0.6) };
            return {
                start: outside(env, side, Math.random()),
                steps: [
                    go(a, { speed: env.v, ease: 'out' }),
                    stay(rand(0.3, 0.8), 3),
                    go(b, { dur: rand(0.12, 0.25), ease: 'dash' }),
                    stay(rand(0.5, 1.2), 4),
                    go(fake, { dur: 0.3, ease: 'out' }),
                    stay(0.15, 2),
                    go(b, { dur: 0.2, ease: 'dash' }),
                    stay(rand(0.4, 1), 3),
                    go(randomExit(env), { speed: env.v * 1.2, ease: 'dash' })
                ]
            };
        },

        // Series of short stops and sudden jumps.
        darts(env) {
            const side = randInt(0, 3);
            const first = inside(env);
            const steps = [go(first, { speed: env.v, ease: 'out' })];
            let cur = first;
            for (let i = randInt(4, 8); i > 0; i--) {
                steps.push(stay(rand(0.15, 0.8), 3));
                cur = Math.random() < 0.5 ? near(env, cur, 120, 350) : inside(env);
                steps.push(go(cur, { dur: rand(0.1, 0.3), ease: 'dash' }));
            }
            steps.push(go(randomExit(env), { speed: env.v, ease: 'inOut' }));
            return { start: outside(env, side, Math.random()), steps };
        },

        // Pokes the tip in from an edge, hides, then comes back further in.
        peek(env) {
            const side = randInt(0, 3);
            const start = outside(env, side, rand(0.15, 0.85));
            const d = INWARD[side];
            const dim = Math.min(env.w, env.h);
            const at = depth => ({ x: start.x + d.x * (env.m + depth), y: start.y + d.y * (env.m + depth) });
            return {
                start,
                steps: [
                    go(at(dim * rand(0.05, 0.12)), { speed: env.v * 0.7, ease: 'out' }),
                    stay(rand(0.6, 1.4), 4),
                    go(start, { speed: env.v * 0.7 }),
                    stay(rand(0.5, 1.5), 0),
                    go(at(dim * rand(0.25, 0.45)), { speed: env.v, ease: 'dash' }),
                    stay(rand(1, 2.5), 8),
                    go(start, { speed: env.v * 0.8 })
                ]
            };
        }
    };

    // ---- Actor (scripted head) -----------------------------------------------------------------

    function createActor(plan, delay, sway) {
        const a = {
            x: plan.start.x,
            y: plan.start.y,
            from: { x: plan.start.x, y: plan.start.y },
            steps: plan.steps,
            index: 0,
            t: 0,
            dur: 0,
            delay: delay,
            clock: rand(0, 100),
            sway: sway,
            finished: false
        };
        beginStep(a);
        return a;
    }

    function beginStep(a) {
        const step = a.steps[a.index];
        a.t = 0;
        a.from = { x: a.x, y: a.y };
        if (step && step.hold === undefined) {
            const dist = Math.hypot(step.x - a.x, step.y - a.y);
            a.dur = step.speed ? Math.max(0.15, dist / step.speed) : step.dur;
        }
    }

    function updateActor(a, dt) {
        if (a.finished) return;
        if (a.delay > 0) {
            a.delay -= dt;
            return;
        }
        a.clock += dt;

        const step = a.steps[a.index];
        if (!step) {
            a.finished = true;
            return;
        }
        a.t += dt;

        if (step.hold !== undefined) {
            // The jitter fades in and out so the head never jumps between steps
            const fade = clamp(Math.min(a.t * 4, (step.hold - a.t) * 4), 0, 1);
            const sway = a.sway;
            const f = sway.freq;
            a.x = a.from.x + Math.sin(a.clock * 17 * f) * Math.sin(a.clock * 5.3 * f + 1) * step.amp * sway.amp * fade;
            a.y = a.from.y + Math.cos(a.clock * 13 * f) * Math.sin(a.clock * 4.1 * f) * step.amp * sway.amp * fade;
            if (a.t >= step.hold) {
                a.index++;
                beginStep(a);
            }
            return;
        }

        const k = Math.min(a.t / a.dur, 1);
        const p = EASE[step.ease](k);
        let x = lerp(a.from.x, step.x, p);
        let y = lerp(a.from.y, step.y, p);
        if (step.wave) {
            const dx = step.x - a.from.x;
            const dy = step.y - a.from.y;
            const len = Math.hypot(dx, dy) || 1;
            const off = Math.sin(k * Math.PI * 2 * step.wave.freq) * step.wave.amp * Math.sin(k * Math.PI);
            x += (-dy / len) * off;
            y += (dx / len) * off;
        }
        a.x = x;
        a.y = y;
        if (k >= 1) {
            a.index++;
            beginStep(a);
        }
    }

    // ---- Laser rendering -----------------------------------------------------------------------

    const LASER_HUES = [0, 0, 0, 120, 170, 200, 280, 320, 55]; // red is over-represented on purpose
    const TRAIL_LIFE = 0.4;
    const TRAIL_BUCKETS = 5; // trail is drawn in a few batched strokes instead of one per segment

    // Pre-rendered glow so the head costs one drawImage instead of a blurred arc
    const glowSprites = {};
    function glowSprite(hue) {
        if (glowSprites[hue]) return glowSprites[hue];
        const size = 128;
        const sprite = document.createElement('canvas');
        sprite.width = sprite.height = size;
        const g = sprite.getContext('2d');
        const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.12, '#fff');
        grad.addColorStop(0.3, `hsla(${hue}, 100%, 55%, 0.9)`);
        grad.addColorStop(1, `hsla(${hue}, 100%, 55%, 0)`);
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
        glowSprites[hue] = sprite;
        return sprite;
    }

    const lasers = {
        margin: () => 60,
        sway: { amp: 1, freq: 1 }, // hold jitter: small and fast
        maxDpr: 1, // low-end tablets: never render above CSS resolution
        speed: 1,
        max: 2,
        gap: [0.4, 3.5],
        weights: { pass: 3, linger: 2, feint: 2, darts: 3, peek: 1 },

        init(a, env) {
            a.hue = pick(LASER_HUES);
            a.size = Math.max(4, Math.min(env.w, env.h) / 110);
            a.trail = [];
        },

        update(a, now) {
            if (a.delay > 0) return;
            const tr = a.trail;
            if (!a.finished) {
                const last = tr[tr.length - 1];
                if (last && Math.hypot(a.x - last.x, a.y - last.y) < 1.5) {
                    last.t = now; // not moving: refresh instead of piling up points
                } else {
                    tr.push({ x: a.x, y: a.y, t: now });
                }
            }
            while (tr.length && now - tr[0].t > TRAIL_LIFE) tr.shift();
            if (a.finished && !tr.length) a.dead = true;
        },

        // No shadowBlur and no blend modes: both are very slow on weak GPUs
        draw(c, a, env, now) {
            const tr = a.trail;
            if (!tr.length) return;
            c.lineCap = 'round';
            c.lineJoin = 'round';

            if (tr.length > 1) {
                for (let b = 0; b < TRAIL_BUCKETS; b++) {
                    const life = (b + 0.5) / TRAIL_BUCKETS;
                    c.beginPath();
                    let any = false;
                    for (let i = 1; i < tr.length; i++) {
                        const l = 1 - (now - tr[i].t) / TRAIL_LIFE;
                        if (l <= 0 || Math.min(Math.floor(l * TRAIL_BUCKETS), TRAIL_BUCKETS - 1) !== b) continue;
                        c.moveTo(tr[i - 1].x, tr[i - 1].y);
                        c.lineTo(tr[i].x, tr[i].y);
                        any = true;
                    }
                    if (!any) continue;
                    // Soft outer glow, saturated body, hot white core
                    c.strokeStyle = `hsla(${a.hue}, 100%, 55%, ${life * 0.3})`;
                    c.lineWidth = a.size * 5 * life;
                    c.stroke();
                    c.strokeStyle = `hsla(${a.hue}, 100%, 55%, ${life})`;
                    c.lineWidth = a.size * 2.2 * life;
                    c.stroke();
                    c.strokeStyle = `rgba(255, 255, 255, ${life})`;
                    c.lineWidth = a.size * 0.8 * life;
                    c.stroke();
                }
            }

            if (!a.finished) {
                const d = a.size * 9 * (1 + 0.1 * Math.sin(now * 60));
                c.drawImage(glowSprite(a.hue), a.x - d / 2, a.y - d / 2, d, d);
            }
        },

        background: '#000'
    };

    // ---- String rendering ----------------------------------------------------------------------

    const STRING_COLORS = ['#c0392b', '#2c3e50', '#d4a017', '#2e8b57', '#8e44ad', '#e67e22', '#2980b9'];
    const SEGMENTS = 40;

    const strings = {
        // Far enough that the whole rope is off-screen once the head reaches the exit
        margin: env => env.segLen * SEGMENTS + 60,
        sway: { amp: 5, freq: 0.22 }, // hold jitter: wide and slow, like a swinging string
        maxDpr: 1.5,
        speed: 0.75,
        max: 2,
        gap: [1, 5],
        weights: { pass: 2, linger: 2, feint: 2, darts: 1, peek: 3 },

        init(a, env) {
            a.color = pick(STRING_COLORS);
            a.width = Math.max(4, Math.min(env.w, env.h) / 110);
            a.pts = [];
            for (let i = 0; i < SEGMENTS; i++) a.pts.push({ x: a.x, y: a.y });
        },

        update(a, now, env, dt) {
            if (a.delay > 0) return;
            const pts = a.pts;
            pts[0].x = a.x;
            pts[0].y = a.y;
            for (let i = 1; i < pts.length; i++) {
                const p = pts[i];
                const q = pts[i - 1];
                p.y += 30 * dt; // slight droop when the head stops
                const dx = p.x - q.x;
                const dy = p.y - q.y;
                const d = Math.hypot(dx, dy);
                if (d > env.segLen) {
                    p.x = q.x + (dx / d) * env.segLen;
                    p.y = q.y + (dy / d) * env.segLen;
                }
            }
            if (a.finished) {
                const pad = 5;
                a.dead = pts.every(p => p.x < -pad || p.x > env.w + pad || p.y < -pad || p.y > env.h + pad);
            }
        },

        draw(c, a, env, now) {
            if (a.delay > 0) return;

            // Travelling wave along the body so the string stays alive even when the head stops.
            // The head (i = 0) and the tail end are pinned, the middle waves sideways.
            const src = a.pts;
            const last = src.length - 1;
            const pts = src.map((p, i) => {
                const prev = src[Math.max(i - 1, 0)];
                const next = src[Math.min(i + 1, last)];
                const dx = next.x - prev.x;
                const dy = next.y - prev.y;
                const len = Math.hypot(dx, dy) || 1;
                const off = Math.sin(now * 4 - i * 0.45) * a.width * 1.6 * Math.sin(Math.PI * i / last);
                return { x: p.x - (dy / len) * off, y: p.y + (dx / len) * off };
            });

            const trace = () => {
                c.beginPath();
                c.moveTo(pts[0].x, pts[0].y);
                for (let i = 1; i < pts.length - 1; i++) {
                    const mx = (pts[i].x + pts[i + 1].x) / 2;
                    const my = (pts[i].y + pts[i + 1].y) / 2;
                    c.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
                }
                c.lineTo(pts[last].x, pts[last].y);
            };

            c.lineCap = 'round';
            c.lineJoin = 'round';
            c.shadowColor = 'rgba(0, 0, 0, 0.25)';
            c.shadowBlur = 4;
            c.shadowOffsetY = 3;
            c.strokeStyle = a.color;
            c.lineWidth = a.width;
            trace();
            c.stroke();

            // Twisted-twine highlight
            c.shadowColor = 'transparent';
            c.shadowOffsetY = 0;
            c.setLineDash([a.width, a.width * 1.8]);
            c.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            c.lineWidth = a.width * 0.4;
            trace();
            c.stroke();
            c.setLineDash([]);
        },

        background: '#fff'
    };

    // ---- Arena: spawns actors and runs the render loop -----------------------------------------

    function createArena(canvas, kind) {
        const style = kind === 'lasers' ? lasers : strings;
        const c = canvas.getContext('2d');
        const env = { w: 0, h: 0, m: 0, v: 0, segLen: 0 };
        let actors = [];
        let clock = 0;
        let nextSpawn = 0;
        let last = 0;
        let raf = 0;

        function resize() {
            const dpr = Math.min(window.devicePixelRatio || 1, style.maxDpr);
            env.w = window.innerWidth;
            env.h = window.innerHeight;
            canvas.width = env.w * dpr;
            canvas.height = env.h * dpr;
            c.setTransform(dpr, 0, 0, dpr, 0, 0);
            env.v = Math.hypot(env.w, env.h) * 0.9 * style.speed; // px/s used for entries and exits
            env.segLen = Math.max(8, Math.min(env.w, env.h) / 40);
            env.m = style.margin(env);
        }

        function weightedBehavior() {
            const entries = Object.entries(style.weights);
            let roll = Math.random() * entries.reduce((sum, e) => sum + e[1], 0);
            for (const [name, weight] of entries) {
                roll -= weight;
                if (roll <= 0) return name;
            }
            return entries[0][0];
        }

        function spawn(name, delay, opts) {
            const a = createActor(BEHAVIORS[name](env, opts), delay, style.sway);
            style.init(a, env);
            actors.push(a);
        }

        function maybeSpawn() {
            if (clock < nextSpawn || actors.length >= style.max) return;
            if (Math.random() < 0.15) {
                // Burst: several parallel sweeps from the same side
                const side = randInt(0, 3);
                for (let i = randInt(2, 3), n = 0; n < i; n++) {
                    spawn('pass', n * rand(0.1, 0.35), { side, f: rand(0.1, 0.9) });
                }
            } else {
                spawn(weightedBehavior(), 0);
            }
            // Sometimes leave the screen empty so the cat has to wait
            nextSpawn = clock + (Math.random() < 0.1 ? rand(5, 9) : rand(style.gap[0], style.gap[1]));
        }

        function frame(ts) {
            raf = requestAnimationFrame(frame);
            const dt = Math.min((ts - last) / 1000, 0.05);
            last = ts;
            clock += dt;

            maybeSpawn();
            for (const a of actors) {
                updateActor(a, dt * style.speed);
                style.update(a, clock, env, dt);
            }
            actors = actors.filter(a => !a.dead);

            c.globalCompositeOperation = 'source-over';
            c.fillStyle = style.background;
            c.fillRect(0, 0, env.w, env.h);
            for (const a of actors) style.draw(c, a, env, clock);
        }

        return {
            start() {
                resize();
                window.addEventListener('resize', resize);
                actors = [];
                clock = 0;
                nextSpawn = 0.3;
                last = performance.now();
                raf = requestAnimationFrame(frame);
            },
            stop() {
                cancelAnimationFrame(raf);
                window.removeEventListener('resize', resize);
                actors = [];
            }
        };
    }

    window.Arena = { create: createArena };
})();
