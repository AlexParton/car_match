
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    class CarModel {
        constructor(
            imageUrl,
            maker, 
            model, 
            version, 
            color,
            colorCode, 
            fuel,
            consumeCode,
            power,
            powerCode,
            year, 
            mileage, 
            mileageCode,
            type,
            typeCode,
            price,
            priceCode, 
            volumeCode) {
                this.imageUrl = imageUrl;
                this.maker = maker;
                this.model = model;
                this.version = version;
                this.color = color;
                this.colorCode = colorCode;
                this.fuel = fuel;
                this.consumeCode = consumeCode;
                this.power = power;
                this.powerCode = powerCode;
                this.year = year;
                this.mileage = mileage;
                this.mileageCode = mileageCode;
                this.type = type;
                this.typeCode = typeCode;
                this.price = price;
                this.priceCode = priceCode;
                this.volumeCode = volumeCode;
        }
    }

    // TYPE: bonito: 5, feo: 1, bonito: 10
    // precio ej: 30k, 100-30/10 = 7
    const garage = [
        new CarModel('images/508.png', 'Peugeot', '508', '5P 225 e-EAT8 Allure', 'Grey', '#44443f', 'Plug-in Hybrid', 8, '224', 7, '2020', '1.000', 9, 'Sedan', 8, '26.780', 7, 7),
        new CarModel('images/stingray.png', 'Chevrolet', 'Corvette', 'Stingray', 'Red', '#ae3730', 'Gasoline', 1, '250', 7, '1979', '120.000', 1, 'Classic', 9, '30.500', 7, 1),
        new CarModel('images/smart.png', 'Smart', 'forTwo', '', 'white', '#fff', 'Electric', 10, '75', 2, '2019', '28.000', 5, 'Compact', 5, '7.200', 10, 1),
        new CarModel('images/e-niro.png', 'Kia', 'Niro', 'PHEV Emotion', 'Dark Blue', '#3d4365', 'Electric', 10, '204', 6, '2021', '500', 9, 'SUV', 5, '32.990', 6, 1),
        new CarModel('images/5008.png', 'Peugeot', '5008', 'BlueHDI EAT6 Active', 'Pearl Blue', '#4b6171', 'Diesel', 5, '120', 4, '2017', '55.000', 5, 'SUV', 7, '23.590', 6, 1),
        new CarModel('images/bmw.png', 'BMW', 'M5', '', 'Black', '#595a5a', 'Gasoline', 2, '625', 10, '2020', '4.000', 8, 'Sedan', 10, '169.000', 1, 7),
        new CarModel('images/q2.png', 'Audi', 'Q2', 'S-Line', 'Matte Grey', '#82858c', 'Diesel', 4, '116', 4, '2020', '18.300', 8, 'SUV', 8, '25.890', 7, 5),
        new CarModel('images/viano.png', 'Mercedes-Benz', 'Viano', 'Avantgarde CDI', 'Brown', '#7b7170', 'Diesel', 3, '224', 6, '2013', '228.300', 3, 'Van', 3, '15.890', 9, 10),
        new CarModel('images/explorer.png', 'Ford', 'Explorer', 'V6 Limited', 'Blue', '#346398', 'Hybrid', 7, '318', 9, '2021', '100', 10, 'Off-Road', 8, '63.500', 4, 9),
        new CarModel('images/ds3.png', 'DS', 'DS3', 'BLUEHDI Performance', 'Yellow', '#e0b846', 'Diesel', 6, '100', 3, '2019', '5', 10, 'Compact', 4, '17.000', 8, 2,),
    ];

    /* src/components/CarCard.svelte generated by Svelte v3.32.3 */

    const file = "src/components/CarCard.svelte";

    // (98:4) {#if matched}
    function create_if_block(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "It's a Match!";
    			attr_dev(h2, "class", "matched svelte-4y47oc");
    			add_location(h2, file, 98, 8, 1510);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(98:4) {#if matched}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div10;
    	let t0;
    	let div0;
    	let img;
    	let img_src_value;
    	let t1;
    	let div9;
    	let div1;
    	let h2;
    	let t2_value = /*car*/ ctx[0].maker + "";
    	let t2;
    	let t3;
    	let t4_value = /*car*/ ctx[0].model + "";
    	let t4;
    	let t5;
    	let span0;
    	let t6_value = /*car*/ ctx[0].version + "";
    	let t6;
    	let t7;
    	let div6;
    	let div2;
    	let p0;
    	let span1;
    	let t9_value = /*car*/ ctx[0].year + "";
    	let t9;
    	let t10;
    	let div3;
    	let p1;
    	let span2;
    	let t12_value = /*car*/ ctx[0].mileage + "";
    	let t12;
    	let t13;
    	let t14;
    	let div4;
    	let p2;
    	let span3;
    	let t16_value = /*car*/ ctx[0].type + "";
    	let t16;
    	let t17;
    	let div5;
    	let p3;
    	let span4;
    	let t19_value = /*car*/ ctx[0].fuel + "";
    	let t19;
    	let t20;
    	let div8;
    	let div7;
    	let t21;
    	let span5;
    	let t22_value = /*car*/ ctx[0].price + "";
    	let t22;
    	let t23;
    	let t24;
    	let button;
    	let div10_class_value;
    	let if_block = /*matched*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div10 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			img = element("img");
    			t1 = space();
    			div9 = element("div");
    			div1 = element("div");
    			h2 = element("h2");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			span0 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			div6 = element("div");
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "Year:";
    			span1 = element("span");
    			t9 = text(t9_value);
    			t10 = space();
    			div3 = element("div");
    			p1 = element("p");
    			p1.textContent = "Mileage:";
    			span2 = element("span");
    			t12 = text(t12_value);
    			t13 = text(" kms.");
    			t14 = space();
    			div4 = element("div");
    			p2 = element("p");
    			p2.textContent = "Type:";
    			span3 = element("span");
    			t16 = text(t16_value);
    			t17 = space();
    			div5 = element("div");
    			p3 = element("p");
    			p3.textContent = "Fuel:";
    			span4 = element("span");
    			t19 = text(t19_value);
    			t20 = space();
    			div8 = element("div");
    			div7 = element("div");
    			t21 = text("Price: ");
    			span5 = element("span");
    			t22 = text(t22_value);
    			t23 = text(" €");
    			t24 = space();
    			button = element("button");
    			button.textContent = "Contact Seller";
    			if (img.src !== (img_src_value = /*car*/ ctx[0].imageUrl)) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "car");
    			add_location(img, file, 101, 8, 1597);
    			attr_dev(div0, "class", "img-wrapper");
    			add_location(div0, file, 100, 4, 1563);
    			attr_dev(span0, "class", "svelte-4y47oc");
    			add_location(span0, file, 105, 40, 1736);
    			attr_dev(h2, "class", "svelte-4y47oc");
    			add_location(h2, file, 105, 12, 1708);
    			attr_dev(div1, "class", "title");
    			add_location(div1, file, 104, 8, 1676);
    			add_location(p0, file, 109, 16, 1863);
    			attr_dev(span1, "class", "svelte-4y47oc");
    			add_location(span1, file, 109, 28, 1875);
    			attr_dev(div2, "class", "spec-item svelte-4y47oc");
    			add_location(div2, file, 108, 12, 1823);
    			add_location(p1, file, 112, 16, 1970);
    			attr_dev(span2, "class", "svelte-4y47oc");
    			add_location(span2, file, 112, 31, 1985);
    			attr_dev(div3, "class", "spec-item svelte-4y47oc");
    			add_location(div3, file, 111, 12, 1930);
    			add_location(p2, file, 115, 16, 2088);
    			attr_dev(span3, "class", "svelte-4y47oc");
    			add_location(span3, file, 115, 28, 2100);
    			attr_dev(div4, "class", "spec-item svelte-4y47oc");
    			add_location(div4, file, 114, 12, 2048);
    			add_location(p3, file, 118, 16, 2195);
    			attr_dev(span4, "class", "svelte-4y47oc");
    			add_location(span4, file, 118, 28, 2207);
    			attr_dev(div5, "class", "spec-item svelte-4y47oc");
    			add_location(div5, file, 117, 12, 2155);
    			attr_dev(div6, "class", "specs svelte-4y47oc");
    			add_location(div6, file, 107, 8, 1791);
    			attr_dev(span5, "class", "svelte-4y47oc");
    			add_location(span5, file, 122, 38, 2334);
    			attr_dev(div7, "class", "price svelte-4y47oc");
    			add_location(div7, file, 122, 12, 2308);
    			attr_dev(button, "class", "svelte-4y47oc");
    			add_location(button, file, 123, 12, 2379);
    			attr_dev(div8, "class", "checkout svelte-4y47oc");
    			add_location(div8, file, 121, 8, 2273);
    			attr_dev(div9, "class", "text svelte-4y47oc");
    			add_location(div9, file, 103, 4, 1649);
    			attr_dev(div10, "class", div10_class_value = "" + (null_to_empty(/*matched*/ ctx[1] ? "carCard matched" : "carCard") + " svelte-4y47oc"));
    			add_location(div10, file, 96, 0, 1426);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div10, anchor);
    			if (if_block) if_block.m(div10, null);
    			append_dev(div10, t0);
    			append_dev(div10, div0);
    			append_dev(div0, img);
    			append_dev(div10, t1);
    			append_dev(div10, div9);
    			append_dev(div9, div1);
    			append_dev(div1, h2);
    			append_dev(h2, t2);
    			append_dev(h2, t3);
    			append_dev(h2, t4);
    			append_dev(h2, t5);
    			append_dev(h2, span0);
    			append_dev(span0, t6);
    			append_dev(div9, t7);
    			append_dev(div9, div6);
    			append_dev(div6, div2);
    			append_dev(div2, p0);
    			append_dev(div2, span1);
    			append_dev(span1, t9);
    			append_dev(div6, t10);
    			append_dev(div6, div3);
    			append_dev(div3, p1);
    			append_dev(div3, span2);
    			append_dev(span2, t12);
    			append_dev(span2, t13);
    			append_dev(div6, t14);
    			append_dev(div6, div4);
    			append_dev(div4, p2);
    			append_dev(div4, span3);
    			append_dev(span3, t16);
    			append_dev(div6, t17);
    			append_dev(div6, div5);
    			append_dev(div5, p3);
    			append_dev(div5, span4);
    			append_dev(span4, t19);
    			append_dev(div9, t20);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, t21);
    			append_dev(div7, span5);
    			append_dev(span5, t22);
    			append_dev(span5, t23);
    			append_dev(div8, t24);
    			append_dev(div8, button);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*matched*/ ctx[1]) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div10, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*car*/ 1 && img.src !== (img_src_value = /*car*/ ctx[0].imageUrl)) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*car*/ 1 && t2_value !== (t2_value = /*car*/ ctx[0].maker + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*car*/ 1 && t4_value !== (t4_value = /*car*/ ctx[0].model + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*car*/ 1 && t6_value !== (t6_value = /*car*/ ctx[0].version + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*car*/ 1 && t9_value !== (t9_value = /*car*/ ctx[0].year + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*car*/ 1 && t12_value !== (t12_value = /*car*/ ctx[0].mileage + "")) set_data_dev(t12, t12_value);
    			if (dirty & /*car*/ 1 && t16_value !== (t16_value = /*car*/ ctx[0].type + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*car*/ 1 && t19_value !== (t19_value = /*car*/ ctx[0].fuel + "")) set_data_dev(t19, t19_value);
    			if (dirty & /*car*/ 1 && t22_value !== (t22_value = /*car*/ ctx[0].price + "")) set_data_dev(t22, t22_value);

    			if (dirty & /*matched*/ 2 && div10_class_value !== (div10_class_value = "" + (null_to_empty(/*matched*/ ctx[1] ? "carCard matched" : "carCard") + " svelte-4y47oc"))) {
    				attr_dev(div10, "class", div10_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div10);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CarCard", slots, []);
    	let { car } = $$props;
    	let { matched = false } = $$props;
    	const writable_props = ["car", "matched"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CarCard> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("car" in $$props) $$invalidate(0, car = $$props.car);
    		if ("matched" in $$props) $$invalidate(1, matched = $$props.matched);
    	};

    	$$self.$capture_state = () => ({ car, matched });

    	$$self.$inject_state = $$props => {
    		if ("car" in $$props) $$invalidate(0, car = $$props.car);
    		if ("matched" in $$props) $$invalidate(1, matched = $$props.matched);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [car, matched];
    }

    class CarCard extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { car: 0, matched: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CarCard",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*car*/ ctx[0] === undefined && !("car" in props)) {
    			console.warn("<CarCard> was created without expected prop 'car'");
    		}
    	}

    	get car() {
    		throw new Error("<CarCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set car(value) {
    		throw new Error("<CarCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get matched() {
    		throw new Error("<CarCard>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set matched(value) {
    		throw new Error("<CarCard>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/CardWrapper.svelte generated by Svelte v3.32.3 */
    const file$1 = "src/components/CardWrapper.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[0] = list[i];
    	return child_ctx;
    }

    // (24:4) {#each garage as car}
    function create_each_block(ctx) {
    	let carcard;
    	let current;

    	carcard = new CarCard({
    			props: { car: /*car*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(carcard.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(carcard, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(carcard.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(carcard.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(carcard, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(24:4) {#each garage as car}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current;
    	let each_value = garage;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "svelte-114426");
    			add_location(div, file$1, 22, 0, 354);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*garage*/ 0) {
    				each_value = garage;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("CardWrapper", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<CardWrapper> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ garage, CarCard });
    	return [];
    }

    class CardWrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CardWrapper",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    class questionModel {
        constructor(question, label1, label2, label3, value) {
            this.question = question;
            this.label1 = label1;
            this.label2 = label2;
            this.label3 = label3;
            this.value = value;
        }
    }

    const Questions = [
        new questionModel('How is your budget like?', 'Very limited', 'Just fine', 'Not a problem', 'budget'),
        new questionModel('How many space would you need?', 'Not much', 'Enough', 'A freighter', 'volume'),
        new questionModel('What are your concerns about fuel consumption?', 'Do not care', 'The less the better', 'Looking for 0 cost', 'fuel'),
        new questionModel('Would you sacrifice some practical space for high-end design?', 'Obviously yes', 'Can I have both?', 'No way', 'type'),
        new questionModel('Are you looking for some excitement?', 'Not really', 'Mild powered', 'Sure thing', 'power'),
        new questionModel('Would you rather find a higher quality even if it also has a higher mileage?', 'Sure thing', 'Balance is key here', 'Not really', 'mileage'),
    ];

    /* src/components/QuestionItem.svelte generated by Svelte v3.32.3 */
    const file$2 = "src/components/QuestionItem.svelte";

    function create_fragment$2(ctx) {
    	let div3;
    	let h3;
    	let t0_value = /*question*/ ctx[0].question + "";
    	let t0;
    	let t1;
    	let div2;
    	let div0;
    	let span0;
    	let t2_value = /*question*/ ctx[0].label1 + "";
    	let t2;
    	let t3;
    	let span1;
    	let t4_value = /*question*/ ctx[0].label2 + "";
    	let t4;
    	let t5;
    	let span2;
    	let t6_value = /*question*/ ctx[0].label3 + "";
    	let t6;
    	let t7;
    	let div1;
    	let input;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span1 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			span2 = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			div1 = element("div");
    			input = element("input");
    			attr_dev(h3, "class", "svelte-14c7il3");
    			add_location(h3, file$2, 89, 4, 1436);
    			attr_dev(span0, "class", "svelte-14c7il3");
    			add_location(span0, file$2, 92, 12, 1541);
    			attr_dev(span1, "class", "svelte-14c7il3");
    			add_location(span1, file$2, 93, 12, 1584);
    			attr_dev(span2, "class", "svelte-14c7il3");
    			add_location(span2, file$2, 94, 12, 1627);
    			attr_dev(div0, "class", "labels svelte-14c7il3");
    			add_location(div0, file$2, 91, 8, 1508);
    			attr_dev(input, "type", "range");
    			attr_dev(input, "min", "1");
    			attr_dev(input, "max", "5");
    			attr_dev(input, "step", "1");
    			attr_dev(input, "class", "svelte-14c7il3");
    			add_location(input, file$2, 97, 12, 1722);
    			attr_dev(div1, "class", "slidecontainer svelte-14c7il3");
    			add_location(div1, file$2, 96, 8, 1681);
    			attr_dev(div2, "class", "selector-wrapper svelte-14c7il3");
    			add_location(div2, file$2, 90, 4, 1469);
    			attr_dev(div3, "class", "option-wrapper svelte-14c7il3");
    			add_location(div3, file$2, 88, 0, 1403);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h3);
    			append_dev(h3, t0);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t2);
    			append_dev(div0, t3);
    			append_dev(div0, span1);
    			append_dev(span1, t4);
    			append_dev(div0, t5);
    			append_dev(div0, span2);
    			append_dev(span2, t6);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*inputValue*/ ctx[1]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*input_change_input_handler*/ ctx[3]),
    					listen_dev(input, "input", /*input_change_input_handler*/ ctx[3]),
    					listen_dev(input, "input", /*input_handler*/ ctx[4], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*question*/ 1 && t0_value !== (t0_value = /*question*/ ctx[0].question + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*question*/ 1 && t2_value !== (t2_value = /*question*/ ctx[0].label1 + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*question*/ 1 && t4_value !== (t4_value = /*question*/ ctx[0].label2 + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*question*/ 1 && t6_value !== (t6_value = /*question*/ ctx[0].label3 + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*inputValue*/ 2) {
    				set_input_value(input, /*inputValue*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("QuestionItem", slots, []);
    	const dispatch = createEventDispatcher();
    	let { question } = $$props;
    	let inputValue = 3;
    	const writable_props = ["question"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<QuestionItem> was created with unknown prop '${key}'`);
    	});

    	function input_change_input_handler() {
    		inputValue = to_number(this.value);
    		$$invalidate(1, inputValue);
    	}

    	const input_handler = () => dispatch("input", [inputValue, question.value]);

    	$$self.$$set = $$props => {
    		if ("question" in $$props) $$invalidate(0, question = $$props.question);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		question,
    		inputValue
    	});

    	$$self.$inject_state = $$props => {
    		if ("question" in $$props) $$invalidate(0, question = $$props.question);
    		if ("inputValue" in $$props) $$invalidate(1, inputValue = $$props.inputValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [question, inputValue, dispatch, input_change_input_handler, input_handler];
    }

    class QuestionItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { question: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QuestionItem",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*question*/ ctx[0] === undefined && !("question" in props)) {
    			console.warn("<QuestionItem> was created without expected prop 'question'");
    		}
    	}

    	get question() {
    		throw new Error("<QuestionItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set question(value) {
    		throw new Error("<QuestionItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src/components/MatcherWrapper.svelte generated by Svelte v3.32.3 */
    const file$3 = "src/components/MatcherWrapper.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (130:8) {#each Questions as question }
    function create_each_block$1(ctx) {
    	let questionitem;
    	let current;

    	questionitem = new QuestionItem({
    			props: { question: /*question*/ ctx[11] },
    			$$inline: true
    		});

    	questionitem.$on("input", /*handleInput*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(questionitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(questionitem, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(questionitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(questionitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(questionitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(130:8) {#each Questions as question }",
    		ctx
    	});

    	return block;
    }

    // (140:0) {#if isMatch}
    function create_if_block$1(ctx) {
    	let div1;
    	let carcard;
    	let t0;
    	let div0;
    	let button;
    	let div1_transition;
    	let current;
    	let mounted;
    	let dispose;

    	carcard = new CarCard({
    			props: { matched: "true", car: /*match*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			create_component(carcard.$$.fragment);
    			t0 = space();
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Keep Browsing";
    			attr_dev(button, "class", "match-close svelte-pafh20");
    			add_location(button, file$3, 143, 12, 3497);
    			attr_dev(div0, "class", "button-wrapper svelte-pafh20");
    			add_location(div0, file$3, 142, 8, 3456);
    			attr_dev(div1, "class", "match svelte-pafh20");
    			add_location(div1, file$3, 140, 4, 3367);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			mount_component(carcard, div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, button);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*closeMatch*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const carcard_changes = {};
    			if (dirty & /*match*/ 1) carcard_changes.car = /*match*/ ctx[0];
    			carcard.$set(carcard_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(carcard.$$.fragment, local);

    			add_render_callback(() => {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, true);
    				div1_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(carcard.$$.fragment, local);
    			if (!div1_transition) div1_transition = create_bidirectional_transition(div1, fade, {}, false);
    			div1_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(carcard);
    			if (detaching && div1_transition) div1_transition.end();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(140:0) {#if isMatch}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let h2;
    	let t1;
    	let t2;
    	let div1;
    	let button;
    	let t4;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = Questions;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block = /*isMatch*/ ctx[1] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Let us find the car that fits your needs.";
    			t1 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "FIND ME A CAR";
    			t4 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(h2, "class", "svelte-pafh20");
    			add_location(h2, file$3, 128, 8, 3053);
    			attr_dev(div0, "class", "options svelte-pafh20");
    			add_location(div0, file$3, 127, 4, 3023);
    			attr_dev(button, "class", "svelte-pafh20");
    			add_location(button, file$3, 135, 8, 3276);
    			attr_dev(div1, "class", "checkout svelte-pafh20");
    			add_location(div1, file$3, 134, 4, 3245);
    			attr_dev(div2, "class", "matcher-wrapper svelte-pafh20");
    			add_location(div2, file$3, 126, 0, 2989);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			insert_dev(target, t4, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*carFinder*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Questions, handleInput*/ 4) {
    				each_value = Questions;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (/*isMatch*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*isMatch*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t4);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("MatcherWrapper", slots, []);
    	let match = garage[0];
    	let isMatch = false;
    	let budgetMultiplier = 3;
    	let volumeMultiplier = 3;
    	let fuelMultiplier = 3;
    	let typeMultiplier = 3;
    	let powerMultiplier = 3;
    	let mileageMultiplier = 3;

    	const handleInput = event => {
    		const inputValue = event.detail[0];
    		const field = event.detail[1];
    		budgetMultiplier = field === "budget" && inputValue;
    		volumeMultiplier = field === "volume" && inputValue;
    		fuelMultiplier = field === "fuel" && inputValue;
    		typeMultiplier = field === "type" && inputValue;
    		mileageMultiplier = field === "mileage" && inputValue;
    		powerMultiplier = field === "power" && inputValue;
    	};

    	const carFinder = () => {
    		let ratio;
    		let updatedGarage = [...garage];

    		for (let i = 0; i < updatedGarage.length; i++) {
    			ratio = updatedGarage[i].priceCode * budgetMultiplier;
    			ratio += updatedGarage[i].volumeCode * volumeMultiplier;
    			ratio += updatedGarage[i].consumeCode * fuelMultiplier;
    			ratio += updatedGarage[i].typeCode * typeMultiplier;
    			ratio += updatedGarage[i].mileageCode * mileageMultiplier;
    			ratio += updatedGarage[i].powerCode * mileageMultiplier;
    			updatedGarage[i] = { ...updatedGarage[i], ratio };
    		}

    		updatedGarage.sort((a, b) => a.ratio > b.ratio ? 1 : b.ratio > a.ratio ? -1 : 0);
    		$$invalidate(0, match = updatedGarage[0]);
    		$$invalidate(1, isMatch = true);
    	};

    	const closeMatch = () => {
    		$$invalidate(1, isMatch = false);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<MatcherWrapper> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		garage,
    		CarCard,
    		Questions,
    		QuestionItem,
    		scale,
    		fade,
    		match,
    		isMatch,
    		budgetMultiplier,
    		volumeMultiplier,
    		fuelMultiplier,
    		typeMultiplier,
    		powerMultiplier,
    		mileageMultiplier,
    		handleInput,
    		carFinder,
    		closeMatch
    	});

    	$$self.$inject_state = $$props => {
    		if ("match" in $$props) $$invalidate(0, match = $$props.match);
    		if ("isMatch" in $$props) $$invalidate(1, isMatch = $$props.isMatch);
    		if ("budgetMultiplier" in $$props) budgetMultiplier = $$props.budgetMultiplier;
    		if ("volumeMultiplier" in $$props) volumeMultiplier = $$props.volumeMultiplier;
    		if ("fuelMultiplier" in $$props) fuelMultiplier = $$props.fuelMultiplier;
    		if ("typeMultiplier" in $$props) typeMultiplier = $$props.typeMultiplier;
    		if ("powerMultiplier" in $$props) powerMultiplier = $$props.powerMultiplier;
    		if ("mileageMultiplier" in $$props) mileageMultiplier = $$props.mileageMultiplier;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [match, isMatch, handleInput, carFinder, closeMatch];
    }

    class MatcherWrapper extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "MatcherWrapper",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/PageTogler.svelte generated by Svelte v3.32.3 */
    const file$4 = "src/components/PageTogler.svelte";

    function create_fragment$4(ctx) {
    	let div4;
    	let div1;
    	let div0;
    	let t1;
    	let div3;
    	let div2;
    	let div4_class_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "MATCHER";
    			t1 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div2.textContent = "BROWSER";
    			attr_dev(div0, "class", "svelte-8kaxh1");
    			add_location(div0, file$4, 69, 8, 1266);
    			attr_dev(div1, "class", "togglerA svelte-8kaxh1");
    			add_location(div1, file$4, 68, 4, 1208);
    			attr_dev(div2, "class", "svelte-8kaxh1");
    			add_location(div2, file$4, 72, 8, 1358);
    			attr_dev(div3, "class", "togglerB svelte-8kaxh1");
    			add_location(div3, file$4, 71, 4, 1300);

    			attr_dev(div4, "class", div4_class_value = "" + (null_to_empty(/*isMatcher*/ ctx[0]
    			? "toggler-wrapper left"
    			: "toggler-wrapper") + " svelte-8kaxh1"));

    			add_location(div4, file$4, 67, 0, 1131);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "click", /*togglerHandler*/ ctx[1], false, false, false),
    					listen_dev(div3, "click", /*togglerHandler*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*isMatcher*/ 1 && div4_class_value !== (div4_class_value = "" + (null_to_empty(/*isMatcher*/ ctx[0]
    			? "toggler-wrapper left"
    			: "toggler-wrapper") + " svelte-8kaxh1"))) {
    				attr_dev(div4, "class", div4_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PageTogler", slots, []);
    	const dispatch = createEventDispatcher();
    	let isMatcher = false;

    	const togglerHandler = () => {
    		$$invalidate(0, isMatcher = !isMatcher);
    		dispatch("pagetoggler");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PageTogler> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		isMatcher,
    		togglerHandler
    	});

    	$$self.$inject_state = $$props => {
    		if ("isMatcher" in $$props) $$invalidate(0, isMatcher = $$props.isMatcher);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isMatcher, togglerHandler];
    }

    class PageTogler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PageTogler",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Topbar.svelte generated by Svelte v3.32.3 */

    const file$5 = "src/components/Topbar.svelte";

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "CAR MATCH";
    			attr_dev(div0, "class", "brand svelte-16gf382");
    			add_location(div0, file$5, 24, 4, 437);
    			attr_dev(div1, "class", "topbar svelte-16gf382");
    			add_location(div1, file$5, 23, 0, 412);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Topbar", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Topbar> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Topbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Topbar",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.32.3 */
    const file$6 = "src/App.svelte";

    function create_fragment$6(ctx) {
    	let topbar;
    	let t0;
    	let pagetogler;
    	let t1;
    	let div2;
    	let div0;
    	let cardwrapper;
    	let div0_class_value;
    	let t2;
    	let div1;
    	let matcherwrapper;
    	let div1_class_value;
    	let current;
    	topbar = new Topbar({ $$inline: true });
    	pagetogler = new PageTogler({ $$inline: true });
    	pagetogler.$on("pagetoggler", /*pagetoggler_handler*/ ctx[1]);
    	cardwrapper = new CardWrapper({ $$inline: true });
    	matcherwrapper = new MatcherWrapper({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(topbar.$$.fragment);
    			t0 = space();
    			create_component(pagetogler.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			div0 = element("div");
    			create_component(cardwrapper.$$.fragment);
    			t2 = space();
    			div1 = element("div");
    			create_component(matcherwrapper.$$.fragment);

    			attr_dev(div0, "class", div0_class_value = "" + (null_to_empty(/*isBrowser*/ ctx[0]
    			? "cardwrapper"
    			: "cardwrapper hide") + " svelte-97z36j"));

    			add_location(div0, file$6, 50, 1, 814);

    			attr_dev(div1, "class", div1_class_value = "" + (null_to_empty(/*isBrowser*/ ctx[0]
    			? "matchwrapper"
    			: "matchwrapper show") + " svelte-97z36j"));

    			add_location(div1, file$6, 53, 1, 904);
    			attr_dev(div2, "class", "superwrapper svelte-97z36j");
    			add_location(div2, file$6, 49, 0, 786);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(topbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(pagetogler, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			mount_component(cardwrapper, div0, null);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			mount_component(matcherwrapper, div1, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*isBrowser*/ 1 && div0_class_value !== (div0_class_value = "" + (null_to_empty(/*isBrowser*/ ctx[0]
    			? "cardwrapper"
    			: "cardwrapper hide") + " svelte-97z36j"))) {
    				attr_dev(div0, "class", div0_class_value);
    			}

    			if (!current || dirty & /*isBrowser*/ 1 && div1_class_value !== (div1_class_value = "" + (null_to_empty(/*isBrowser*/ ctx[0]
    			? "matchwrapper"
    			: "matchwrapper show") + " svelte-97z36j"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(topbar.$$.fragment, local);
    			transition_in(pagetogler.$$.fragment, local);
    			transition_in(cardwrapper.$$.fragment, local);
    			transition_in(matcherwrapper.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(topbar.$$.fragment, local);
    			transition_out(pagetogler.$$.fragment, local);
    			transition_out(cardwrapper.$$.fragment, local);
    			transition_out(matcherwrapper.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(topbar, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(pagetogler, detaching);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    			destroy_component(cardwrapper);
    			destroy_component(matcherwrapper);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let isBrowser = true;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const pagetoggler_handler = () => $$invalidate(0, isBrowser = !isBrowser);

    	$$self.$capture_state = () => ({
    		CardWrapper,
    		MatcherWrapper,
    		PageTogler,
    		Topbar,
    		isBrowser
    	});

    	$$self.$inject_state = $$props => {
    		if ("isBrowser" in $$props) $$invalidate(0, isBrowser = $$props.isBrowser);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [isBrowser, pagetoggler_handler];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
