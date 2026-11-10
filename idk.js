class TP {
	folders = new Map();
	tp = {};
	constructor(title, id, Pane) {
		this.pane = new Pane({ title });
		this.container.id = id;
		this.id = id;
		this.tooltip = document.createElement("div");
		this.#addStyles();
		this.#makeDraggable();
	}
	addFolder(title, cb = null) {
		const folder = this.pane.addFolder({
			title: this.capitalise(title),
			expanded: false,
		});
		if (typeof cb === "function") folder.on("change", cb);
		this.folders.set(title.toLocaleLowerCase(), folder);
	}
	getFolder(title) {
		return this.folders.get(title.toLocaleLowerCase());
	}
	disposeFolder(folderName) {
		const folder = this.getFolder(folderName);
		if (folder) folder.dispose() && delete this.tp[folderName.toLocaleLowerCase()];
	}

	addTabs(folderName, ...tabs) {
		const folder = this.getFolder(folderName);
		if (!folder) return;
		folder.addTab({
			pages: tabs.map((title) => ({ title })),
		});

		folder.getElement = function (tabNumber) {
			return this.children[tabNumber];
		};
	}

	addInput({
		location = {},
		propertyName,
		options,
		callback = () => {},
		description = "",
		value,
		isButton = false,
	}) {
		const { folder: folderName, tab: tabIdx, pos = 0, index } = location;
		const tp = this.tp;
		const key = folderName.toLocaleLowerCase();
		if (!tp[key]) tp[key] = {};

		const folder = this.getFolder(folderName);
		if (!folder) return;

		const target = typeof tabIdx === "number" ? folder.getElement(tabIdx).pages[pos] : folder;

		const stored = JSON.parse(localStorage.getItem(`${this.id}${this.capitalise(folderName)}`));
		stored && Object.assign(tp[key], stored);
		// console.log(stored, tp[key])

		if (!(propertyName in tp[key])) tp[key][propertyName] = value ?? options?.value;
		if (typeof index === "number") options.index = index;

		let input;
		if (isButton) input = target.addButton(options);
		else input = target.addBinding(tp[key], propertyName, options);
		if (typeof callback === "function") {
			isButton ? input.on("click", callback) : input.on("change", callback);
		}

		if (description) {
			const el = input.element;
			el.addEventListener("mouseenter", () => {
				this.tooltip.textContent = description;
				this.tooltip.style.display = "block";
			});
			el.addEventListener("mouseleave", () => {
				this.tooltip.style.display = "none";
			});
		}

		return input;
	}

	addKeyBindInput({ location, propertyName, value, label = "" }) {
		const { folder: folderName, tab: tabIdx, pos = 0 } = location;
		const tp = this.tp;
		const key = folderName.toLocaleLowerCase();
		if (!tp[key]) tp[key] = {};

		const folder = this.getFolder(folderName);
		if (!folder) return;

		const target = typeof tabIdx === "number" ? folder.getElement(tabIdx).pages[pos] : folder;

		const stored = JSON.parse(localStorage.getItem(`${this.id}${this.capitalise(folderName)}`));
		stored && Object.assign(tp[key], stored);

		if (!(propertyName in tp[key])) tp[key][propertyName] = value;

		const btn = target.addButton({
			title: tp[key][propertyName].toUpperCase() ?? "Set Bind",
			label,
		});

		let listening = false;

		/**
		 *
		 * @param {KeyboardEvent} event
		 * @returns
		 */
		const handler = (event) => {
			event.preventDefault();
			event.stopPropagation();

			const key2 = event.key.toLocaleLowerCase();
			if (key2 === "escape") {
				listening = false;
				btn.title = tp[key][propertyName].toUpperCase() ?? "Set Bind";
				document.removeEventListener("keydown", handler);
				return;
			}
			tp[key][propertyName] = key2;
			btn.title = key2.toUpperCase();
			listening = false;
			localStorage.setItem(
				`${this.id}${this.capitalise(folderName)}`,
				JSON.stringify(tp[key]),
			);
			document.removeEventListener("keydown", handler);
		};

		btn.on("click", function () {
			if (listening) return;
			listening = true;
			btn.title = "Press a button...";
			document.addEventListener("keydown", handler);
		});

		return btn;
	}

	removeInput({folderName, inputIdx, all = false}) {
		const folder = this.getFolder(folderName);
		if (!folder) return;
		if (!all) folder.children[inputIdx]?.dispose();
		else {
			for (const child of folder.children) {
				child?.dispose();
			}
		}
	}

	refreshFolder(folderName) {
		const f = this.getFolder(folderName);
		if (!f) return;
		f.refresh();
	}
	/**
	 *
	 * @param {String} str
	 * @returns capitalised String
	 */
	capitalise(str) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	#addStyles() {
		Object.assign(this.tooltip.style, {
			position: "fixed",
			left: "20px",
			bottom: "20px",

			display: "none",

			width: "350px",
			padding: "16px 20px",

			background: "rgba(0, 0, 0, 0.9)",
			color: "white",

			border: "1px solid rgba(255, 255, 255, 0.2)",
			borderRadius: "8px",

			fontSize: "16px",
			lineHeight: "1.5",

			pointerEvents: "none",
			zIndex: "999999",

			boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
		});

		document.body.appendChild(this.tooltip);
		this.container.style.zIndex = 1000;
	}

	#makeDraggable() {
		let self = this;
		let element = this.container;
		let notMenu;
		if (element) {
			let offsetX, offsetY;
			element.addEventListener("mousedown", function (e) {
				const dragElement = function (e) {
					const x = ((e.clientX - offsetX) / window.innerWidth) * 100;
					const y = ((e.clientY - offsetY) / window.innerHeight) * 100;
					const maxX = 100 - (element.offsetWidth / window.innerWidth) * 100;
					const maxY = 100 - (element.offsetHeight / window.innerHeight) * 100;
					element.style.left = `${Math.max(0, Math.min(x, maxX))}%`;
					element.style.top = `${Math.max(0, Math.min(y, maxY))}%`;

					localStorage.setItem(
						`${self.id}Pos`,
						JSON.stringify({
							x: Math.max(0, Math.min(x, maxX)),
							y: Math.max(0, Math.min(y, maxY)),
						}),
					);
				};

				if (notMenu || e.target.classList.contains("tp-rotv_t")) {
					offsetX = e.clientX - element.getBoundingClientRect().left;
					offsetY = e.clientY - element.getBoundingClientRect().top;
					document.addEventListener("mousemove", dragElement);
					document.addEventListener("mouseup", function () {
						document.removeEventListener("mousemove", dragElement);
					});
					e.preventDefault(); // Prevent text selection during drag
				}
			});
		}
	}

	get container() {
		return this.pane.containerElem_;
	}
}
