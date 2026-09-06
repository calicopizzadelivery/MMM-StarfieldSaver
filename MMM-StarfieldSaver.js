/* global Module */

Module.register("MMM-StarfieldSaver", {
	defaults: {
		idleTimeout: 30 * 60 * 1000, // ms of no activity before the screensaver kicks in
		starCount: 400,
		starSpeed: 200, // px/sec at the outer edge
		clockDriftSpeed: 40, // px/sec the clock drifts around the screen
		clock24h: false,
		activityThrottle: 500, // ms, avoid resetting the timer on every mousemove tick
		activityEvents: ["mousemove", "mousedown", "keydown", "touchstart", "touchmove", "wheel"],
		// While quiet hours are active, the screensaver never activates on its own timer,
		// and if it's already showing when quiet hours begin, it's dismissed immediately.
		// Times are "HH:MM" in 24h local time. An overnight window (start > end, e.g.
		// "22:00"-"06:00") wraps past midnight correctly.
		// (Flat keys rather than a nested object: MagicMirror's config/defaults merge is
		// shallow, so a partial override of a nested object would silently drop the rest.)
		quietHoursEnabled: true,
		quietHoursStart: "06:00",
		quietHoursEnd: "10:00",
		tickInterval: 15000 // ms between idle/quiet-hours checks
	},

	start() {
		this.active = false;
		this.tickTimer = null;
		this.lastActivityTime = Date.now();
		this.lastActivityHandled = 0;
		this.canvas = null;
		this.ctx = null;
		this.clockElement = null;
		this.stars = [];
		this.animationFrameId = null;
		this.lastFrameTime = 0;
		this.clockPos = { x: 40, y: 40, vx: 1, vy: 1 };

		this.boundHandleActivity = this.handleActivity.bind(this);
		this.boundHandleResize = this.handleResize.bind(this);

		this.config.activityEvents.forEach((evt) => {
			document.addEventListener(evt, this.boundHandleActivity, { passive: true });
		});
		window.addEventListener("resize", this.boundHandleResize);

		this.tickTimer = setInterval(() => this.tick(), this.config.tickInterval);
	},

	getDom() {
		const wrapper = document.createElement("div");
		wrapper.className = "starfield-saver-wrapper";
		wrapper.style.display = this.active ? "block" : "none";

		const canvas = document.createElement("canvas");
		canvas.className = "starfield-canvas";
		this.canvas = canvas;
		wrapper.appendChild(canvas);

		const clock = document.createElement("div");
		clock.className = "starfield-clock";
		this.clockElement = clock;
		wrapper.appendChild(clock);

		return wrapper;
	},

	getStyles() {
		return ["MMM-StarfieldSaver.css"];
	},

	tick() {
		const now = Date.now();
		const inQuietHours = this.isQuietHours();

		if (this.active) {
			if (inQuietHours) {
				this.deactivate();
			}
			return;
		}

		if (!inQuietHours && now - this.lastActivityTime >= this.config.idleTimeout) {
			this.activate();
		}
	},

	isQuietHours() {
		const { quietHoursEnabled, quietHoursStart, quietHoursEnd } = this.config;
		if (!quietHoursEnabled || !quietHoursStart || !quietHoursEnd) return false;

		const [startH, startM] = quietHoursStart.split(":").map(Number);
		const [endH, endM] = quietHoursEnd.split(":").map(Number);
		const startMinutes = startH * 60 + startM;
		const endMinutes = endH * 60 + endM;
		if (startMinutes === endMinutes) return false; // zero-length window == disabled

		const now = new Date();
		const nowMinutes = now.getHours() * 60 + now.getMinutes();

		if (startMinutes < endMinutes) {
			// same-day window, e.g. 06:00-10:00
			return nowMinutes >= startMinutes && nowMinutes < endMinutes;
		}
		// overnight window, e.g. 22:00-06:00
		return nowMinutes >= startMinutes || nowMinutes < endMinutes;
	},

	handleActivity() {
		const now = Date.now();
		this.lastActivityTime = now;

		if (now - this.lastActivityHandled < this.config.activityThrottle) return;
		this.lastActivityHandled = now;

		if (this.active) {
			this.deactivate();
		}
	},

	handleResize() {
		if (this.canvas && this.active) {
			this.canvas.width = window.innerWidth;
			this.canvas.height = window.innerHeight;
		}
	},

	activate() {
		this.active = true;
		this.hideOtherModules();
		this.updateDom(0);
		// getDom() just ran synchronously via updateDom, so canvas/clockElement are fresh.
		this.initAnimation();
	},

	deactivate() {
		this.active = false;
		this.stopAnimation();
		this.updateDom(400);
		this.showOtherModules();
	},

	hideOtherModules() {
		MM.getModules()
			.exceptModule(this)
			.enumerate((module) => module.hide(300, () => {}, { lockString: this.identifier }));
	},

	showOtherModules() {
		MM.getModules()
			.exceptModule(this)
			.enumerate((module) => module.show(300, () => {}, { lockString: this.identifier }));
	},

	initAnimation() {
		if (!this.canvas) return;
		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;
		this.ctx = this.canvas.getContext("2d");
		this.stars = this.createStars(this.config.starCount);

		const w = window.innerWidth;
		const h = window.innerHeight;
		this.clockPos = {
			x: Math.random() * Math.max(w - 260, 0),
			y: Math.random() * Math.max(h - 120, 0),
			vx: (Math.random() < 0.5 ? -1 : 1) * this.config.clockDriftSpeed,
			vy: (Math.random() < 0.5 ? -1 : 1) * this.config.clockDriftSpeed
		};

		this.lastFrameTime = performance.now();
		this.animate();
	},

	createStars(count) {
		const stars = [];
		for (let i = 0; i < count; i++) {
			stars.push(this.newStar());
		}
		return stars;
	},

	newStar() {
		const w = this.canvas.width || 1;
		const h = this.canvas.height || 1;
		return {
			x: (Math.random() - 0.5) * w,
			y: (Math.random() - 0.5) * h,
			z: Math.random() * w
		};
	},

	animate() {
		if (!this.active) return;

		const now = performance.now();
		const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
		this.lastFrameTime = now;

		this.drawStarfield(dt);
		this.updateClockPosition(dt);

		this.animationFrameId = requestAnimationFrame(() => this.animate());
	},

	drawStarfield(dt) {
		const ctx = this.ctx;
		const w = this.canvas.width;
		const h = this.canvas.height;
		const cx = w / 2;
		const cy = h / 2;

		// translucent fill instead of clearRect gives stars short motion trails
		ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
		ctx.fillRect(0, 0, w, h);

		const speed = this.config.starSpeed * dt;

		for (const star of this.stars) {
			star.z -= speed;
			if (star.z <= 1) {
				Object.assign(star, this.newStar());
				star.z = w;
			}

			const k = 128 / star.z;
			const px = star.x * k + cx;
			const py = star.y * k + cy;

			if (px < 0 || px >= w || py < 0 || py >= h) continue;

			const depth = 1 - star.z / w;
			const size = depth * 2.5 + 0.5;
			const shade = Math.floor(depth * 255);
			ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
			ctx.fillRect(px, py, size, size);
		}
	},

	updateClockPosition(dt) {
		if (!this.clockElement) return;

		const w = window.innerWidth;
		const h = window.innerHeight;
		const rectW = this.clockElement.offsetWidth || 220;
		const rectH = this.clockElement.offsetHeight || 80;

		let { x, y, vx, vy } = this.clockPos;
		x += vx * dt;
		y += vy * dt;

		if (x <= 0) {
			x = 0;
			vx = Math.abs(vx);
		} else if (x + rectW >= w) {
			x = Math.max(w - rectW, 0);
			vx = -Math.abs(vx);
		}

		if (y <= 0) {
			y = 0;
			vy = Math.abs(vy);
		} else if (y + rectH >= h) {
			y = Math.max(h - rectH, 0);
			vy = -Math.abs(vy);
		}

		this.clockPos = { x, y, vx, vy };
		this.clockElement.style.transform = `translate(${x}px, ${y}px)`;
		this.clockElement.textContent = this.formatTime();
	},

	formatTime() {
		const now = new Date();
		let hours = now.getHours();
		const minutes = now.getMinutes().toString().padStart(2, "0");
		const seconds = now.getSeconds().toString().padStart(2, "0");
		let suffix = "";

		if (!this.config.clock24h) {
			suffix = hours >= 12 ? " PM" : " AM";
			hours = hours % 12 || 12;
		}

		return `${hours}:${minutes}:${seconds}${suffix}`;
	},

	stopAnimation() {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}
});
