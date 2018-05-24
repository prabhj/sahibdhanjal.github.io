class Robot {
	constructor() {
		var canvas = document.getElementById("mycanvas");
		// this.windowWidth = canvas.width;
		// this.windowHeight = canvas.height;
		this.windowWidth = window.innerWidth;
		this.windowHeight = window.innerHeight;
		this.zIndex = 100;

		this.animation = {
			flyingHeight: 0,
			flyingFreq: 0.015,
			eyeAmplitude: 5,
			eyelidAmplitude: 1,
			modelsAmplitude: .3,
			reactionTime: .600,
			speed: .5,
			eyelidsOpening: 0,
			flying: true
		};

		// BINDINGS
		//////////////////////////////////////////
		this.onWindowResize = this.onWindowResize.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.render = this.render.bind(this);

		// EVENTS
		//////////////////////////////////////////
		window.addEventListener('resize', this.onWindowResize);
		window.addEventListener('mousemove', this.onMouseMove);

		this.init();
	}

	init() {
		this.scene = new THREE.Scene();
		this.mouse = new THREE.Vector2(window.innerWidth, window.innerWidth);

		this.newRenderer();
		this.newCamera();
		this.newLight();
		// this.newGround();
		this.newRobot();
		// this.newGui();
		this.render();
	}

	newRenderer() {
		var my_canvas = document.getElementById("mycanvas");
		this.renderer = new THREE.WebGLRenderer({ canvas: my_canvas, alpha: true, antialias: true });
		this.renderer.setSize(this.windowWidth, this.windowHeight);
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		document.body.appendChild(this.renderer.domElement);
	}

	newCamera() {
		const aspect = this.windowWidth / this.windowHeight;
		const fieldOfView = 45;
		const near = .1;
		const far = 1000;
		this.camera = new THREE.PerspectiveCamera(fieldOfView, aspect, near, far);
		this.camera.position.set(0, 1, 27);
	}

	newLight() {
		const ambientLight = new THREE.AmbientLight(0xe9e9e9, 1);
		ambientLight.position.set(0, 100, 0);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, .1);
		directionalLight.position.set(0, 100, 20);
		directionalLight.castShadow = true;
		directionalLight.shadow.mapSize.width = 2048;
		directionalLight.shadow.mapSize.height = 2048;
		this.scene.add(directionalLight);
	}

	newGround() {
		const geometry = new THREE.PlaneGeometry(45, 45);
		const material = new THREE.MeshLambertMaterial({transparent: true, opacity: 0});
		this.ground = new THREE.Mesh(geometry, material);
		this.ground.rotation.x = THREE.Math.degToRad(-90);
		this.ground.position.y = -7;
		this.ground.receiveShadow = true;
		this.ground.setClearColor = true;
		this.scene.add(this.ground);
	}

	textureLoader(numberOfTextures) {
		this.textureLoader = {
			loader: new THREE.TextureLoader(),
			total: numberOfTextures,
			loaded: 0,
			loadedComplete: false,
			textureLoaded() {
				this.loaded++;
				if (this.loaded == this.total) {
					this.loadedComplete = true;
				}
				console.log(`${ this.loaded }/${ this.total } texture(s) loaded`);
			}
		};
	}

	newRobot() {
		const url = {
			object: 'https://cdn.rawgit.com/Verlangieri/robot-animation/master/app/obj/boule.DAE',
			texture1: 'https://cdn.rawgit.com/Verlangieri/robot-animation/master/app/obj/face.jpg',
			texture2: 'https://cdn.rawgit.com/Verlangieri/robot-animation/master/app/obj/texture.jpg'
		}
		const loader = new THREE.ColladaLoader();
		loader.load(url.object, collada => {
			// Init texture rendering
			this.dataTexture = [url.texture1, url.texture2];
			this.textureLoader(this.dataTexture.length);

			// Robot model
			this.models = collada.scene;
			this.models.rotation.y = THREE.Math.degToRad(-90); // Rotate robot in front direction

			// Set a pivot point
			this.mesh = new THREE.Object3D();
			this.box = new THREE.Box3().setFromObject(this.models);
			this.box.center(this.models.position);
			this.models.position.multiplyScalar(-1);
			this.mesh.add(this.models);
			this.scene.add(this.mesh);

			// Eye
			this.eye = this.models.getObjectByName("Eye", true);

			// Eyelid
			this.eyelidTop = this.models.getObjectByName("Eyelid-top", true);
			this.eyelidBottom = this.models.getObjectByName("Eyelid-bottom", true);
			this.eyelidTop.rotation.x = THREE.Math.degToRad(-88); // -65 = Open; -88 = closed; 
			this.eyelidBottom.rotation.x = THREE.Math.degToRad(-85); // -115= Open; -85 = closed;

			// Lens
			const lens = this.models.getObjectByName("Lens", true);
			lens.material.map = this.textureLoader.loader.load(this.dataTexture[0], this.textureLoader.textureLoaded());
			lens.material.map.minFilter = THREE.LinearFilter;

			const pointLight = new THREE.PointLight(0xffffff, 0.5, 1);
			pointLight.position.z = 30;
			lens.add(pointLight);

			const tl = new TimelineMax({ repeat: -1, yoyo: true });
			tl.from(pointLight, 1, { intensity: 5 });

			// Body
			this.body = this.models.getObjectByName("Body", true);
			this.body.children[0].material.map = this.textureLoader.loader.load(this.dataTexture[1], this.textureLoader.textureLoaded());
			this.body.children[0].material.map.minFilter = THREE.LinearFilter;
			this.body.children[3].castShadow = true;
			this.camera.lookAt(this.models.position);

			this.parameters = {
				lunchIntro: true,
				introComplete: false,
				coef: 0,
				height: this.models.position.y
			};

			// Remove loading message
			// TweenMax.to(document.getElementById('loading'), .5, {opacity: 0});
		});
	}

	introAnimation() {
		const delayTurnOff = 100;
		const delayTurnOn = 300;
		TweenMax.set(this.mesh.position, { x: 10, y: 20 });
		TweenMax.set(this.mesh.rotation, { y: THREE.Math.degToRad(720), z: THREE.Math.degToRad(720) });
		setTimeout(() => {
			this.turnOffAnimation();
		}, delayTurnOff);
		setTimeout(() => {
			this.turnOnAnimation();
		}, delayTurnOn);
	}

	turnOffAnimation() {
		TweenMax.to(this.mesh.position, 1.5, { y: this.ground.position.y + this.box.max.y / 2, ease: Bounce.easeOut });
		TweenMax.to(this.mesh.rotation, 2, {
			x: THREE.Math.degToRad(getRandom(-20, 0)),
			y: THREE.Math.degToRad(getRandom(-30, 30)),
			z: THREE.Math.degToRad(getRandom(-20, 20)),
			ease: Power2.easeOut
		});
	}

	turnOnAnimation() {
		TweenMax.to(this.mesh.position, 1.5, { y: this.animation.flyingHeight, ease: Power2.easeOut });
		TweenMax.to(this.mesh.rotation, 1, { x: 0, y: 0, z: 0, ease: Power2.easeOut });
		TweenMax.to(this.eyelidTop.rotation, .5, { x: THREE.Math.degToRad(-75), ease: Power2.easeOut }, 1.5);
		TweenMax.to(this.eyelidBottom.rotation, .5, { x: THREE.Math.degToRad(-100), ease: Power2.easeOut, onStart: () => {
				this.parameters.introComplete = true;
			} }, 1.5);
	}

	flyingAnimation() {
		this.parameters.coef += this.animation.flyingFreq;
		const c = Math.sin(Math.PI * this.parameters.coef);
		this.eye.position.y = this.animation.eyeAmplitude * c;
		this.models.position.y = c * this.animation.modelsAmplitude + this.parameters.height;
		this.eyelidTop.position.y = this.eyelidBottom.position.y = this.animation.eyelidAmplitude * c;
	}

	standbyAnimation(state) {
		if (!state) {
			this.turnOffAnimation();
			TweenMax.to(this.models.position, .5, { y: this.parameters.height }); // prevent ground collision
		} else if (state) {
			this.turnOnAnimation();
		}
	}

	mouseAnimation() {
		TweenMax.to(this.eye.rotation, this.animation.speed, { x: this.mouse.y / 5, y: this.mouse.x / 3, delay: this.animation.reactionTime });
		TweenMax.to(this.mesh.rotation, this.animation.speed, { y: 0.3 + this.mouse.x / 2, x: 0.2 -(this.mouse.y / 5), delay: this.animation.reactionTime });
		TweenMax.to(this.eyelidTop.rotation, this.animation.speed, { y: this.mouse.x / 4, x: THREE.Math.degToRad(-75 + this.animation.eyelidsOpening) + (this.mouse.y - Math.abs(this.mouse.x)) / 10, delay: this.animation.reactionTime });
		TweenMax.to(this.eyelidBottom.rotation, this.animation.speed, { y: this.mouse.x / 4, x: THREE.Math.degToRad(-100 - this.animation.eyelidsOpening) + (this.mouse.y + Math.abs(this.mouse.x)) / 10, delay: this.animation.reactionTime });
	}

	updateRobot() {
		if (this.models !== undefined && this.textureLoader.loadedComplete === true) {
			// Introduction
			if (this.parameters.lunchIntro) {
				this.introAnimation();
				this.parameters.lunchIntro = false;
			}
			// Flying
			if (this.parameters.introComplete && this.animation.flying) {
				this.flyingAnimation();
			}
		}
	}

	mouseUpdate() {
		if (this.parameters.introComplete) {
			this.mouseAnimation();
		}
	}

	onMouseMove(event) {
		this.mouse.x = event.clientX / window.innerWidth * 2 - 1;
		this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		this.mouseUpdate();
	}

	onWindowResize() {
		// var canvas = document.getElementById("mycanvas");
		// this.windowWidth = canvas.width;
		// this.windowHeight = canvas.height;
		
		this.windowWidth = window.innerWidth;
		this.windowHeight = window.innerHeight;
		this.renderer.setSize(this.windowWidth, this.windowHeight);
		this.camera.aspect = this.windowWidth / this.windowHeight;
		this.camera.updateProjectionMatrix();
	}

	newGui() {
		const gui = new dat.GUI({ width: 270 });

		const f1 = gui.addFolder('Flying animation');
		f1.add(this.animation, 'flyingFreq', .01, .05).name('frequency');
		f1.add(this.animation, 'modelsAmplitude', 0, 1).name('robot amplitude');
		f1.add(this.animation, 'eyelidAmplitude', 0, 5).name('eyelid amplitude');
		f1.add(this.animation, 'eyeAmplitude', 0, 5).name('eye amplitude');
		f1.add(this.animation, 'flying').onChange(e => {
			this.standbyAnimation(e);
		});

		const f2 = gui.addFolder('Mouse interaction');
		f2.add(this.animation, 'reactionTime', 0, .5).name('reaction time');
		f2.add(this.animation, 'speed', .1, 1).name('slowness');
		f2.add(this.animation, 'eyelidsOpening', 0, 10).name('eyelids opening');
	}

	render() {
		this.updateRobot();
		this.renderer.render(this.scene, this.camera);
		requestAnimationFrame(this.render);
	}
}

const getRandom = (min, max) => Math.random() * (max - min + 1) + min;

window.onload = new Robot();