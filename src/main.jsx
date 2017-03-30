import React from 'react';
import ReactDOM from 'react-dom';
import SimplexNoise from 'simplex-noise';
import Rand from 'random-seed';

const AppConfig = {
    fullspace:true,
    verticalAlign: "middle",
    syncSystem: true,
    appName: "Procedural Generated Terrain",
    author: "YenRaven"
};

class Main extends React.Component {
    constructor(props){
        super(props);

        this.simplex = new SimplexNoise();
        this.terrainTextures = [];
        this.terrain = [];
        this.merged = [];

        this.boxId = 0;

        this.state = {
            user:null,
            sync:{
                width: 64,
                height: 64,
                depth: 32,
                seed: null
            }
        }

        if(altspace.getUser){
            altspace.getUser().then((user) => {
                this.setState({user});
            });
        }

        this.boxSizes = new Array(this.state.height);

        //this.generateWorld();
    }

    componentWillUpdate(nextProps, nextState){
        if(nextState != this.state){
            if(this.sync && nextState.user.isModerator){
                var onComplete = function(error) {
                  if (error) {
                    console.log('Synchronization failed');
                  } else {
                    console.log('Synchronization succeeded');
                  }
                };
                this.sync.instance.set(nextState.sync, onComplete);
            }
            if(nextState.sync.seed != this.state.sync.seed){
                this.simplex = new SimplexNoise((new Rand(nextState.sync.seed)).random);
                this.generateWorld();
            }
        }
    }

    render() {

        this.box = new Array();

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
                            return <a-mixin id="merge" geometry={`mergeTo:#blockMerge${id}; skipCache: true; buffer: false`}></a-mixin>
                        }else{
                            return null;
                        }
                    })
                }
                <img src={require("base64-image!../assets/dirt.jpg")} id="dirt" ref="dirt" />
                <img src={require("base64-image!../assets/topbottom.jpg")} id="topbottom" ref="topbottom" />
                <img src={require("base64-image!../assets/cap.jpg")} id="cap" ref="cap" /> 
                {this.terrainTextures.map((txt, id) => {
                    return (
                        txt?
                            <canvas key={id} width={txt.width} height={txt.height} ref={(c) => {this["terrain"+id] = c;}} id={`terrain${id}`} />
                            : null
                        );
                    })
                }
            </a-assets>
            {(this.state.user && this.state.user.isModerator) ? (
                <TextControlBtn
                    position={new THREE.Vector3(-1, 0.4, -1.5)}
                    color="#888888"
                    value="New"
                    width="0.5"
                    height="0.1"
                    onClick={ this.newWorld }
                />
            ) : null
            }
            {
                this.boxSizes.map((isSize, id)=>{
                    if(isSize){
                        return <a-entity id={`blockMerge${id}`}></a-entity>
                    }else{
                        return null;
                    }
                })
            }
            {
                this.terrain.map((x, xid) => {
                    return x.map((y, yid) => {
                        return y.map((block, zid) => {
                            return <a-entity
                                    mixin={`blockMerge${block.end - block.start}`}
                                    ref = {(box) => {
                                        if(box){
                                            this.box.push({
                                                el:box,
                                                height: block.end - block.start
                                            });
                                        }
                                    }}
                                    key={"box"+(this.boxId++)}
                                    id={this.boxId}
                                    position={`${xid} ${(block.end - block.start)/2 + (block.start - 1)} ${yid}`}
                                    n-box-collider={`size: 1 ${block.end-block.start} 1; type: environment;`} />;
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
                    seed:Math.random()*999999999
                }
            }
        })
    }

    componentDidMount(){
        if(altspace.utilities && altspace.utilities.sync){
            this.scene.addEventListener("connected", () => {
                this.sync = this.scene.systems['sync-system'].connection;
                var callback = (data) => {
                    if(data.val().seed){
                        this.setState({
                            sync: data.val()
                        });
                    }else{
                        if(this.state.user.isModerator){
                            this.setState((state) => {
                                return {
                                    ...state,
                                    owner: true,
                                    sync: {
                                        ...state.sync,
                                        seed:Math.random()*999999999
                                    }
                                }
                            });
                        }
                    }
                }
                this.sync.instance.on("value", callback);
            });
        }else{
            this.setState((state) => {
                return {
                    ...state,
                    owner: true,
                    sync: {
                        ...state.sync,
                        seed:Math.random()
                    }
                }
            });
        }
        //this.meshBoxes();
    }

    componentDidUpdate(){
        this.meshBoxes();
    }

    generateTexture(height){
        var uv128 = 1 / (height * 2 + 1);
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
            width:256,
            height: 128 + 128 * height * 2,
            geometry: geometry,
            uv: uv
        };
    }

    generateWorld(){
        const width = this.state.sync.width;
        const height = this.state.sync.height;
        const depth = this.state.sync.depth;

        var terrain = [];
        for(var x = 0; x < width; x++){
            terrain[x] = [];
            for(var y = 0; y < height; y++){
                terrain[x][y] = [];
                var blockStart = null;

                for(var z = 0; z < depth; z++){
                    var t = this.simplex.noise3D(x/16, y/16, z/16) * 0.5 + 0.5;
                    t += this.simplex.noise3D(x/32, y/32, z/32) * 0.5 + 0.5;
                    t = (t/2) > 0.5;
                    if(!blockStart){
                        if(t){
                            blockStart = z;
                        }
                    }else{
                        if(!t || z === depth-1){
                            terrain[x][y].push({start:blockStart, end:z});
                            var h = z - blockStart;
                            this.boxSizes[h] = true;
                            if(!this.terrainTextures[h]){
                                this.terrainTextures[h] = this.generateTexture(h);
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
            dirtLoad = [],
            mesh = [];
        this.terrainTextures.forEach((t, height) => {
            if(t){
                let ctx = this["terrain"+height].getContext("2d");

                //top bottom
                if(this.refs.topbottom.width>0){
                    ctx.drawImage(this.refs.topbottom, 0, 0, 256, 128);
                }else{
                    topBottomLoad.push(((ctx) => () => {
                        ctx.drawImage(this.refs.topbottom, 0, 0, 256, 128);
                    })(ctx));
                }

                //caps
                if(this.refs.cap.width>0){
                    ctx.drawImage(this.refs.cap, 0, 128, 128, 128);
                    ctx.drawImage(this.refs.cap, 128, 128, 128, 128);
                    ctx.drawImage(this.refs.cap, 0, 128 + 128 * height, 128, 128);
                    ctx.drawImage(this.refs.cap, 128, 128 + 128 * height, 128, 128);
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
                    //ctx.fillRect(0, 128, 256, 128);
                    ctx.fillRect(0, 128 + 128 * height, 256, 128);
                }else{
                    capLoad.push(((ctx) => () => {
                        ctx.drawImage(this.refs.cap, 0, 128, 128, 128);
                        ctx.drawImage(this.refs.cap, 128, 128, 128, 128);
                        ctx.drawImage(this.refs.cap, 0, 128 + 128 * height, 128, 128);
                        ctx.drawImage(this.refs.cap, 128, 128 + 128 * height, 128, 128);
                        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
                        //ctx.fillRect(0, 128, 256, 128);
                        ctx.fillRect(0, 128 + 128 * height, 256, 128);
                    })(ctx))
                }

                //sides
                if(this.refs.dirt.width>0){
                    for(var i = 1; i < height; i++){
                        ctx.drawImage(this.refs.dirt, 0, 128 + 128 * i, 128, 128);
                        ctx.drawImage(this.refs.dirt, 128, 128 + 128 * i, 128, 128);
                        ctx.drawImage(this.refs.dirt, 0, 128 + 128 * height + 128 * i, 128, 128);
                        ctx.drawImage(this.refs.dirt, 128, 128 + 128 * height + 128 * i, 128, 128);
                    }
                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
                    //ctx.fillRect(0, 256, 256, 128 * (height-1));
                    ctx.fillRect(0, 256 + 128 * height, 256, 128 * (height-1));
                }else{
                    dirtLoad.push(((ctx) => () => {
                        for(var i = 1; i < height; i++){
                            ctx.drawImage(this.refs.dirt, 0, 128 + 128 * i, 128, 128);
                            ctx.drawImage(this.refs.dirt, 128, 128 + 128 * i, 128, 128);
                            ctx.drawImage(this.refs.dirt, 0, 128 + 128 * height + 128 * i, 128, 128);
                            ctx.drawImage(this.refs.dirt, 128, 128 + 128 * height + 128 * i, 128, 128);
                        }
                        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
                        //ctx.fillRect(0, 256, 256, 128 * (height-1));
                        ctx.fillRect(0, 256 + 128 * height, 256, 128 * (height-1));
                    })(ctx));
                }
            }

            mesh[height] = new THREE.Mesh(
                (new THREE.BufferGeometry()).fromGeometry(t.geometry),
                new THREE.MeshBasicMaterial({
                    map: new THREE.CanvasTexture(this["terrain"+height])
                })
            )
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
            if(box.el){
                box.el.setObject3D("mesh", mesh[box.height].clone());
            }
        });
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
                    position="0 0 0.03"
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
