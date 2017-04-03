import React from 'react';
import ReactDOM from 'react-dom';
import SimplexNoise from 'simplex-noise';
import Rand from 'random-seed';
import shuffle from './util/shuffle.js';

const AppConfig = {
    fullspace:true,
    verticalAlign: "middle",
    syncSystem: true,
    appName: "Procedural Generated Terrain",
    author: "YenRaven"
};

const CSS_COLOR_NAMES = shuffle( ["AliceBlue","AntiqueWhite","Aqua","Aquamarine","Azure","Beige","Bisque","Black","BlanchedAlmond","Blue","BlueViolet","Brown","BurlyWood","CadetBlue","Chartreuse","Chocolate","Coral","CornflowerBlue","Cornsilk","Crimson","Cyan","DarkBlue","DarkCyan","DarkGoldenRod","DarkGray","DarkGrey","DarkGreen","DarkKhaki","DarkMagenta","DarkOliveGreen","Darkorange","DarkOrchid","DarkRed","DarkSalmon","DarkSeaGreen","DarkSlateBlue","DarkSlateGray","DarkSlateGrey","DarkTurquoise","DarkViolet","DeepPink","DeepSkyBlue","DimGray","DimGrey","DodgerBlue","FireBrick","FloralWhite","ForestGreen","Fuchsia","Gainsboro","GhostWhite","Gold","GoldenRod","Gray","Grey","Green","GreenYellow","HoneyDew","HotPink","IndianRed","Indigo","Ivory","Khaki","Lavender","LavenderBlush","LawnGreen","LemonChiffon","LightBlue","LightCoral","LightCyan","LightGoldenRodYellow","LightGray","LightGrey","LightGreen","LightPink","LightSalmon","LightSeaGreen","LightSkyBlue","LightSlateGray","LightSlateGrey","LightSteelBlue","LightYellow","Lime","LimeGreen","Linen","Magenta","Maroon","MediumAquaMarine","MediumBlue","MediumOrchid","MediumPurple","MediumSeaGreen","MediumSlateBlue","MediumSpringGreen","MediumTurquoise","MediumVioletRed","MidnightBlue","MintCream","MistyRose","Moccasin","NavajoWhite","Navy","OldLace","Olive","OliveDrab","Orange","OrangeRed","Orchid","PaleGoldenRod","PaleGreen","PaleTurquoise","PaleVioletRed","PapayaWhip","PeachPuff","Peru","Pink","Plum","PowderBlue","Purple","Red","RosyBrown","RoyalBlue","SaddleBrown","Salmon","SandyBrown","SeaGreen","SeaShell","Sienna","Silver","SkyBlue","SlateBlue","SlateGray","SlateGrey","Snow","SpringGreen","SteelBlue","Tan","Teal","Thistle","Tomato","Turquoise","Violet","Wheat","White","WhiteSmoke","Yellow","YellowGreen"]);

class Main extends React.Component {
    constructor(props){
        super(props);

        this.simplex = new SimplexNoise();
        this.terrainTextures = [];
        this.terrain = [];
        this.merged = [];
        this.mesh = [];

        this.boxId = 0;

        this.state = {
            enclosure: false,
            user:false,
            skeleton:false,
            approvedSudoMods:["YenRaven", "Zerithax"],
            sync:{
                colors:CSS_COLOR_NAMES,
                world:{
                    width: 16,
                    height: 16,
                    depth: 16,
                    seed: null
                },
                climb:{}
            }
        }

        if(altspace.getUser){
            Promise.all([
                altspace.getUser(),
                altspace.getThreeJSTrackingSkeleton(),
                altspace.getEnclosure()
            ]).then((values) => {
                this.setState({
                    user:values[0],
                    skeleton:values[1],
                    enclosure:values[2]
                });
            });
        }

        this.boxSizes = new Array(this.state.height);

        this.climberRaycaster = new THREE.Raycaster();

        //this.generateWorld();
    }

    shouldComponentUpdate(nextProps, nextState){
        if(JSON.stringify(nextState.sync) != JSON.stringify(this.state.sync)){
            return true;
        }
        return false;
    }

    componentWillUpdate(nextProps, nextState){
        if(this.sync && this.state.sync.world.seed){
            var onComplete = function(error) {
              if (error) {
                console.log('Synchronization failed');
              } else {
                console.log('Synchronization succeeded');
              }
            };
            if(nextState.user.isModerator){
                this.sync.instance.set(nextState.sync, onComplete);
            }else{
                this.sync.instance.child("climb").set(nextState.sync.climb, onComplete);
            }
        }
        if(nextState.sync.world.seed != this.state.sync.world.seed){
            this.simplex = new SimplexNoise((new Rand(nextState.sync.world.seed)).random);
        }
        if(JSON.stringify(nextState.sync.world) != JSON.stringify(this.state.sync.world)){
            this.generateWorld(nextState.sync.world.width, nextState.sync.world.height, nextState.sync.world.depth);
        }
    }

    render() {
        this.box = new Array();
        var flagRotation = 0;

        return (
            <a-scene
                ref={(scene) => {this.scene = scene;}}
                altspace={`vertical-align: ${AppConfig.verticalAlign}; fullspace: ${AppConfig.fullspace};`}
                sync-system={AppConfig.syncSystem && altspace.utilities?`app: ${AppConfig.appName}; author: ${AppConfig.author}` : null}
            >
            <a-assets>
                {
                    this.boxSizes.map((isSize, id)=>{
                        if(isSize){
                            return <a-mixin key={id} id="merge" geometry={`mergeTo:#blockMerge${id}; skipCache: true; buffer: false`}></a-mixin>
                        }else{
                            return null;
                        }
                    })
                }
                <img src={require("base64-image!../assets/dirt.jpg")} id="dirt" ref="dirt" />
                <img src={require("base64-image!../assets/topbottom.jpg")} id="topbottom" ref="topbottom" />
                <img src={require("base64-image!../assets/cap.jpg")} id="cap" ref="cap" />
                <img src="../assets/grass.jpg" id="grass" ref="grass" />
                {this.terrainTextures.map((txt, id) => {
                    return (
                        txt?
                            <canvas key={id} width={txt.width} height={txt.height} ref={(c) => {this["terrain"+id] = c;}} id={`terrain${id}`} />
                            : null
                        );
                    })
                }
            </a-assets>
            {(this.state.user && (this.state.user.isModerator || this.state.approvedSudoMods.includes(this.state.user.displayName))) ? [
                <TextControlBtn
                    key="newBtn"
                    position={new THREE.Vector3(-1, 0.4, -1.5)}
                    color="#888888"
                    value="New"
                    width="0.5"
                    height="0.1"
                    onClick={ this.newWorld }
                />,

                <TextControlBtn
                    key="widthBtn"
                    position={new THREE.Vector3(-1, 0.29, -1.5)}
                    color="#884444"
                    value={`Width:${this.state.sync.world.width}`}
                    width="0.3"
                    height="0.1"
                />,
                <TextControlBtn
                    key="widthBtn+"
                    position={new THREE.Vector3(-0.75, 0.29, -1.5)}
                    color="#884444"
                    value="+"
                    width="0.1"
                    height="0.1"
                    onClick={this.nextWidth(true)}
                />,
                <TextControlBtn
                    key="widthBtn-"
                    position={new THREE.Vector3(-1.25, 0.29, -1.5)}
                    color="#884444"
                    value="-"
                    width="0.1"
                    height="0.1"
                    onClick={this.nextWidth(false)}
                />,

                <TextControlBtn
                    key="heightBtn"
                    position={new THREE.Vector3(-1, 0.18, -1.5)}
                    color="#448844"
                    value={`Height:${this.state.sync.world.height}`}
                    width="0.3"
                    height="0.1"
                />,
                <TextControlBtn
                    key="heightBtn+"
                    position={new THREE.Vector3(-0.75, 0.18, -1.5)}
                    color="#448844"
                    value="+"
                    width="0.1"
                    height="0.1"
                    onClick={this.nextHeight(true)}
                />,
                <TextControlBtn
                    key="heightBtn-"
                    position={new THREE.Vector3(-1.25, 0.18, -1.5)}
                    color="#448844"
                    value="-"
                    width="0.1"
                    height="0.1"
                    onClick={this.nextHeight(false)}
                />,

                <TextControlBtn
                    key="depthBtn"
                    position={new THREE.Vector3(-1, 0.07, -1.5)}
                    color="#444488"
                    value={`Depth:${this.state.sync.world.depth}`}
                    width="0.3"
                    height="0.1"
                />,
                <TextControlBtn
                    key="depthBtn+"
                    position={new THREE.Vector3(-0.75, 0.07, -1.5)}
                    color="#444488"
                    value="+"
                    width="0.1"
                    height="0.1"
                    onClick={this.nextDepth(true)}
                />,
                <TextControlBtn
                    key="depthBtn-"
                    position={new THREE.Vector3(-1.25, 0.07, -1.5)}
                    color="#444488"
                    value="-"
                    width="0.1"
                    height="0.1"
                    onClick={this.nextDepth(false)}
                />
            ] : null
            }
            <a-plane
                rotation="-90 0 0"
                position={`${this.state.sync.world.width/2} 0 ${this.state.sync.world.height/2}`}
                width={this.state.sync.world.width + 16}
                height={this.state.sync.world.height + 16}
                src="#grass"
                repeat={`${this.state.sync.world.width + 16} ${this.state.sync.world.height + 16}`}
            />
            <a-entity
                position="0 0 0"
                sound="src: url(../assets/From_Russia_With_Love.mp3); autoplay: true; loop: true; volume: 0.01;"
            />
            {
                Object.keys(this.state.sync.climb).map((key, id, keyList) => {
                    var climb = this.state.sync.climb[key];
                    console.log("Flag color:", this.state.sync.colors[id]);
                    return <RecordFlag position={climb} name={key} flagColor={this.state.sync.colors[id].toLowerCase()} flagRotation={360/keyList.length * id} />
                })
            }
            {
                this.boxSizes.map((isSize, id)=>{
                    if(isSize){
                        return <a-entity key={id} id={`blockMerge${id}`} ref={(merged) => {this.merged[id] = merged;}}></a-entity>
                    }else{
                        return null;
                    }
                })
            }
            {
                this.state.skeleton && this.state.user && this.state.enclosure &&
                this.terrain.map((x, xid) => {
                    return x.map((y, yid) => {
                        return y.map((block, zid) => {
                            let height = block.end - block.start;
                            let position = new THREE.Vector3(xid, height/2 + (block.start - 1), yid);
                            return <a-entity
                                    mixin={true?null:`blockMerge${height}`}
                                    ref = {(box) => {
                                        if(box){
                                            this.box.push({
                                                el:box,
                                                height: height
                                            });
                                        }
                                    }}
                                    key={`${position.x}${position.y}${position.z}`}
                                    position={`${position.x} ${position.y} ${position.z}`} />;
                        })
                    })
                })
            }
            </a-scene>
        )
    }

    newWorld = () => {
        this.setState((state)=>{
            return {
                ...state,
                sync: {
                    ...state.sync,
                    world:{
                        ...state.sync.world,
                        seed:Math.random()*999999999
                    },
                    climb:{}
                }
            }
        })
    }

    nextWidth = (inc) => () => {
        this.setState((state)=>{
            return{
                ...state,
                sync: {
                    ...state.sync,
                    world:{
                        ...state.sync.world,
                        width: inc? state.sync.world.width * 2 : state.sync.world.width / 2
                    }
                }
            }
        })
    }

    nextHeight = (inc) => () => {
        this.setState((state)=>{
            return{
                ...state,
                sync: {
                    ...state.sync,
                    world: {
                        ...state.sync.world,
                        height: inc? state.sync.world.height * 2 : state.sync.world.height / 2
                    }
                }
            }
        })
    }

    nextDepth = (inc) => () => {
        this.setState((state)=>{
            return{
                ...state,
                sync: {
                    ...state.sync,
                    world: {
                        ...state.sync.world,
                        depth: inc? state.sync.world.depth * 2 : state.sync.world.depth / 2
                    }
                }
            }
        })
    }

    componentDidMount(){
        if(altspace.utilities && altspace.utilities.sync){
            this.scene.addEventListener("connected", () => {
                this.sync = this.scene.systems['sync-system'].connection;
                var callback = (data) => {
                    let val = data.val();
                    if(val.world){
                        let syncVals = {
                            colors:val.colors,
                            world:{
                                ...val.world
                            },
                            climb:{
                                ...val.climb
                            }
                        };
                        if(JSON.stringify(syncVals) != JSON.stringify(this.state.sync)){
                            this.setState({
                                sync: syncVals
                            });
                        }
                    }else if(this.state.user.isModerator){
                        this.newWorld();
                    }
                }
                this.sync.instance.on("value", callback);
            });
        }else{
            this.newWorld();
        }

        setInterval(() => {
            if(this.state.skeleton){
                let spinePos = this.state.skeleton.getJoint("Spine").getWorldPosition();
                let topBoxPos = {y: 0};
                this.box.forEach((box) => {
                    let boxPos = box.el.getAttribute("position");
                    if(boxPos.y + box.height/2 < spinePos.y){
                        if(boxPos.x - 0.5 < spinePos.x && boxPos.x + 0.5 > spinePos.x){
                            if(boxPos.z - 0.5 < spinePos.z && boxPos.z + 0.5 > spinePos.z){
                                if(topBoxPos.y < boxPos.y + box.height/2){
                                    topBoxPos = {
                                        ...boxPos,
                                        y: boxPos.y + box.height/2
                                    }
                                }
                            }
                        }
                    }
                })

                if(topBoxPos.y > 0){
                    if(!this.state.sync.climb[this.state.user.displayName] || this.state.sync.climb[this.state.user.displayName].y < topBoxPos.y){
                        this.setState((state) => {
                            var newState = {
                                ...state,
                                sync:{
                                    ...state.sync,
                                    climb:{
                                        ...state.sync.climb
                                    }
                                }
                            };
                            newState.sync.climb[state.user.displayName] = topBoxPos;
                            return newState;
                        })
                    }
                }
            }
        }, 500);
    }

    componentDidUpdate(){
        this.meshBoxes();
    }

    generateGeometry(height){
        //var uv16 = 1 / (height * 2 + 1);
        var uvH = height / (height * 2 + 1);

        var uv = {
            top: [
                new THREE.Vector2(0, uvH*2),
                new THREE.Vector2(.5, uvH*2),
                new THREE.Vector2(.5, 1),
                new THREE.Vector2(0, 1)
            ],
            bottom: [
                new THREE.Vector2(.5, uvH*2),
                new THREE.Vector2(1, uvH*2),
                new THREE.Vector2(1, 1),
                new THREE.Vector2(.5, 1)
            ],
            back: [
                    new THREE.Vector2(0, uvH*2),
                    new THREE.Vector2(0, uvH),
                    new THREE.Vector2(.5, uvH),
                    new THREE.Vector2(.5, uvH*2)
            ],
            right: [
                    new THREE.Vector2(.5, uvH*2),
                    new THREE.Vector2(.5, uvH),
                    new THREE.Vector2(1, uvH),
                    new THREE.Vector2(1, uvH*2)
            ],
            front: [
                    new THREE.Vector2(0, uvH),
                    new THREE.Vector2(0, 0),
                    new THREE.Vector2(.5, 0),
                    new THREE.Vector2(.5, uvH)
            ],
            left: [
                    new THREE.Vector2(.5, uvH),
                    new THREE.Vector2(.5, 0),
                    new THREE.Vector2(1, 0),
                    new THREE.Vector2(1, uvH)
            ]
        };

        var geometry = new THREE.BoxGeometry( 1, height, 1 );
        geometry.faceVertexUvs[0] = [];

        geometry.faceVertexUvs[0][0] = [uv.left[0], uv.left[1], uv.left[3]]
        geometry.faceVertexUvs[0][1] = [uv.left[1], uv.left[2], uv.left[3]]

        geometry.faceVertexUvs[0][2] = [uv.right[0], uv.right[1], uv.right[3]]
        geometry.faceVertexUvs[0][3] = [uv.right[1], uv.right[2], uv.right[3]]

        geometry.faceVertexUvs[0][4] = [uv.top[0], uv.top[1], uv.top[3]]
        geometry.faceVertexUvs[0][5] = [uv.top[1], uv.top[2], uv.top[3]]

        geometry.faceVertexUvs[0][6] = [uv.bottom[0], uv.bottom[1], uv.bottom[3]]
        geometry.faceVertexUvs[0][7] = [uv.bottom[1], uv.bottom[2], uv.bottom[3]]

        geometry.faceVertexUvs[0][8] = [uv.front[0], uv.front[1], uv.front[3]]
        geometry.faceVertexUvs[0][9] = [uv.front[1], uv.front[2], uv.front[3]]

        geometry.faceVertexUvs[0][10] = [uv.back[0], uv.back[1], uv.back[3]]
        geometry.faceVertexUvs[0][11] = [uv.back[1], uv.back[2], uv.back[3]]

        return {
            width:32,
            height: 16 + 16 * height * 2,
            geometry: geometry,
            uv: uv
        };
    }

    generateWorld(width, height, depth){
        var terrain = [];
        for(var x = 0; x < width; x++){
            terrain[x] = [];
            for(var y = 0; y < height; y++){
                terrain[x][y] = [];
                var blockStart = null;

                for(var z = 0; z < depth; z++){
                    var t = this.simplex.noise3D(x/16, y/16, z/16) * 0.5 + 0.5;
                    t += this.simplex.noise3D(x/32, y/32, z/32) * 0.5 + 0.5;
                    var smtn = (1 - z/depth) * 0.5 + 0.5;
                    t = (t/2) * smtn > 0.5;


                    // let a1, a2, a3, a4, a5, a6;
                    // a1 = a2 = a3 = a4 = a5 = a6 = false;
                    //
                    // if(x-1 >= 0){
                    //     a1 = this.simplex.noise3D((x-1)/16, y/16, z/16) * 0.5 + 0.5;
                    //     a1 += this.simplex.noise3D((x-1)/32, y/32, z/32) * 0.5 + 0.5;
                    //     a1 = (a1/2) > 0.5;
                    // }
                    //
                    // if(y-1 >= 0){
                    //     a2 = this.simplex.noise3D(x/16, (y-1)/16, z/16) * 0.5 + 0.5;
                    //     a2 += this.simplex.noise3D(x/32, (y-1)/32, z/32) * 0.5 + 0.5;
                    //     a2 = (a2/2) > 0.5;
                    // }
                    //
                    // if(x+1 < width){
                    //     a3 = this.simplex.noise3D((x+1)/16, y/16, z/16) * 0.5 + 0.5;
                    //     a3 += this.simplex.noise3D((x+1)/32, y/32, z/32) * 0.5 + 0.5;
                    //     a3 = (a3/2) > 0.5;
                    // }
                    //
                    // if(y+1 < height){
                    //     a4 = this.simplex.noise3D(x/16, (y+1)/16, z/16) * 0.5 + 0.5;
                    //     a4 += this.simplex.noise3D(x/32, (y+1)/32, z/32) * 0.5 + 0.5;
                    //     a4 = (a4/2) > 0.5;
                    // }
                    //
                    // if(z-1 >= 0){
                    //     a5 = this.simplex.noise3D(x/16, y/16, (z-1)/16) * 0.5 + 0.5;
                    //     a5 += this.simplex.noise3D(x/32, y/32, (z-1)/32) * 0.5 + 0.5;
                    //     a5 = (a5/2) > 0.5;
                    // }
                    //
                    // if(z+1 < depth){
                    //     a6 = this.simplex.noise3D(x/16, y/16, (z+1)/16) * 0.5 + 0.5;
                    //     a6 += this.simplex.noise3D(x/32, y/32, (z+1)/32) * 0.5 + 0.5;
                    //     a6 = (a6/2) > 0.5;
                    // }

                    if(!blockStart){
                        //if(t && !(a1 && a2 && a3 && a4 && a5 && a6)){
                        if(t){
                            blockStart = z;
                        }
                    }else{
                        //if(!t || (a1 && a2 && a3 && a4 && a5 && a6) || z === depth){
                        if(!t || z === depth - 1){
                            terrain[x][y].push({start:blockStart, end:z});
                            var h = z - blockStart;
                            this.boxSizes[h] = true;
                            if(!this.terrainTextures[h]){
                                this.terrainTextures[h] = this.generateGeometry(h);
                            }
                            blockStart = null;
                        }
                    }
                }
            }
        }
        this.terrain= terrain;
    }

    meshBoxes(){
        let topBottomLoad = [],
            capLoad = [],
            dirtLoad = []
        this.terrainTextures.forEach((t, height) => {
            if(!this.mesh[height]){
                if(t){
                    let ctx = this["terrain"+height].getContext("2d");

                    //top bottom
                    ctx.drawImage(this.refs.topbottom, 0, 0, 32, 16);
                    ctx.fillStyle = `rgba(${~~(Math.random()*255)}, ${~~(Math.random()*255)}, ${~~(Math.random()*255)}, 0.1)`
                    ctx.fillRect(0, 0, 16, 16);

                    //caps
                    ctx.drawImage(this.refs.cap, 0, 16, 16, 16);
                    ctx.drawImage(this.refs.cap, 16, 16, 16, 16);
                    ctx.drawImage(this.refs.cap, 0, 16 + 16 * height, 16, 16);
                    ctx.drawImage(this.refs.cap, 16, 16 + 16 * height, 16, 16);
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
                    ctx.fillRect(0, 16 + 16 * height, 32, 16);

                    //sides
                    for(var i = 1; i < height; i++){
                        ctx.drawImage(this.refs.dirt, 0, 16 + 16 * i, 16, 16);
                        ctx.drawImage(this.refs.dirt, 16, 16 + 16 * i, 16, 16);
                        ctx.drawImage(this.refs.dirt, 0, 16 + 16 * height + 16 * i, 16, 16);
                        ctx.drawImage(this.refs.dirt, 16, 16 + 16 * height + 16 * i, 16, 16);
                    }
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
                    ctx.fillRect(0, 32 + 16 * height, 32, 16 * (height-1));


                    ctx.fillStyle = `rgba(${~~(Math.random()*255)}, ${~~(Math.random()*255)}, ${~~(Math.random()*255)}, 0.05)`;
                    ctx.fillRect(0, 16, 32, 16 * (height));
                }


                this.mesh[height] = new THREE.Mesh(
                    (new THREE.BufferGeometry()).fromGeometry(t.geometry),
                    new THREE.MeshBasicMaterial({
                        map: new THREE.CanvasTexture(this["terrain"+height])
                    })
                )
            }
        });

        this.refs.topbottom.onload = () => {
            topBottomLoad.forEach((f) => {
                f();
            })
        };
        this.refs.cap.onload = () => {
            capLoad.forEach((f) => {
                f();
            })
        };
        this.refs.dirt.onload = () => {
            dirtLoad.forEach((f) => {
                f();
            })
        };

        this.box.forEach((box) => {
            if(box.el && !box.el.getAttribute("n-box-collider")){
                let mesh = this.mesh[box.height].clone();
                box.el.setObject3D("mesh", mesh);
                box.el.setAttribute("n-box-collider", `size: 1 ${box.height} 1; type: environment;`);
            }
        });
    }
}

class RecordFlag extends React.Component {
    render(){
        return (
            <a-entity position={`${this.props.position.x} ${this.props.position.y} ${this.props.position.z}`}>
                <a-cylinder color="#888888" height="3" radius="0.025" position="0 1.5 0" />
                <a-entity position="0 2.7 0" rotation={`0 ${this.props.flagRotation} 0`}>
                    <a-plane color={this.props.flagColor} width="1" height="0.6" position="0.5 0 0">
                        <a-entity
                            position="0 0 0.03"
                            n-text={`text: ${this.props.name}; fontSize: 1; horizontalAlign: center;`}>
                        </a-entity>
                    </a-plane>
                    <a-plane color={this.props.flagColor} width="1" height="0.6" position="0.5 0 0" rotation="0 180 0">
                        <a-entity
                            position="0 0 0.03"
                            n-text={`text: ${this.props.name}; fontSize: 1; horizontalAlign: center;`}>
                        </a-entity>
                    </a-plane>
                </a-entity>
            </a-entity>
        )
    }
}

class TextControlBtn extends React.Component {
    render(){
        return (
            <a-plane
                ref={(el)=>{this.el = el;}}
                position={`${this.props.position.x} ${this.props.position.y} ${this.props.position.z}`}
                onClick={this.props.onClick}
                color={this.props.color}
                width={this.props.width}
                height={this.props.height}
                n-cockpit-parent
            >
                <a-entity
                    position="0 0 0.02"
                    n-text={`text: ${this.props.value}; fontSize: 1; horizontalAlign: center;`}
                    n-cockpit-parent
                />
            </a-plane>
        )
    }
    componentDidMount(){
        this.el.setAttribute("altspace-cursor-collider", "enabled: true");
    }
}

ReactDOM.render(
    <Main />,
    document.getElementById('appMain')
);
