import { Matrix4, Vector3 } from "@math.gl/core";
import { Material } from "./ObjLoader";

export interface Component { }

export class PositionComp implements Component {
    constructor(public pos: Vector3) { }
}

export class VelocityComp implements Component {
    constructor(public vel: Vector3) { }
}

export class RenderComp implements Component {
    constructor(public vao: WebGLBuffer, public countTriangles: number, public material: Material) { }
}

export class MaxRadius implements Component {
    public maxRadius: number
    constructor(vertexPositions: Array<number>) {
        this.maxRadius = 0;
        for (let i = 0; i < vertexPositions.length; i = i+3) {
            this.maxRadius = Math.max(this.maxRadius, (Math.sqrt(Math.pow(vertexPositions[i], 2) + Math.pow(vertexPositions[i+1], 2) + Math.pow(vertexPositions[i+2], 2))));
       // if (Number.isNaN(this.maxRadius)){
         //   console.log(vertexPositions[i], vertexPositions[i+1], vertexPositions[i+2], i);
        //}
        }

        console.log(this.maxRadius);
     }
}