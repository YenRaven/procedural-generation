import React from 'react';
import ReactDOM from 'react-dom';
const SimplexNoise = require('simplex-noise');

class Main extends React.Component {
    constructor(props){
        super(props);

        this.simplex = new SimplexNoise()
    }
    render() {
    return (
        <canvas ref={(c) => {this.canvas = c}} id="canvas" width={512} height={512} >

        </canvas>
    )
    }

    componentDidMount(){
        var ctx = canvas.getContext('2d');
        let imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height),
        data = imgdata.data,
        t = 0;
        let simplex = this.simplex;

        let x=256,
            y=500;

        function animate(){
            if(t<450){
                t++;
                requestAnimationFrame(animate);
            }

            let s = simplex.noise2D(x / 128, y / 128) * 0.5 + 0.5;
            s += (simplex.noise2D(x / 32, y / 32) * 0.5 + 0.5);
            s += (simplex.noise2D(x / 8, y / 8) * 0.5 + 0.5);
            s += (simplex.noise2D(x, y) * 0.5 + 0.5);

            let w = simplex.noise2D(x / 256, y / 256) * 0.5 + 0.5;
            w += simplex.noise2D(x/64, y/64) * 0.5 + 0.5;
            w /= 2;
            w *= (450-t) / 450 * 40;

            let d = ~~((s / 4) * 5);
            if(d===0) x--;
            if(d===1) { x--; y--; }
            if(d===2) y--;
            if(d===3) { x++; y--; }
            if(d===4) x++;

            //let p = (y * canvas.width + x);
            ctx.fillStyle = "#996600";
            ctx.fillRect(x-w/2, y, w, 1);
            // data[b]   = 0;
            // data[b+1] = 128;
            // data[b+2] = 0;
            // data[b+3] = 255;

            //ctx.putImageData(imgdata, 0, 0);
        }
        animate();
    }

}

ReactDOM.render(
    <Main />,
    document.getElementById('appMain')
);
