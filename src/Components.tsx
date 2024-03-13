import { Matrix4, Vector3 } from "@math.gl/core";
import { Material, VaoMaterialInfo } from "./ObjLoader";

export interface Component { }

export class PositionComp implements Component {
    constructor(public pos: Vector3) { }
}

export class VelocityComp implements Component {
    constructor(public vel: Vector3) { }
}

export class RenderComp implements Component {
    constructor(public voaMatInfo: Array<VaoMaterialInfo>) { }
}

export class RotationComp implements Component {
    constructor(public rot: Vector3 = new Vector3(0), public rotFuture: Vector3 = new Vector3(0), public activity: Boolean = false) { }
}

export class MaxRadius implements Component {
    public maxRadius: number;
    constructor(vertexPositions: Array<number>) {
        this.maxRadius = 0;
        for (let i = 0; i < vertexPositions.length; i = i + 3) {
            this.maxRadius = Math.max(this.maxRadius, (Math.sqrt(Math.pow(vertexPositions[i], 2) + Math.pow(vertexPositions[i + 1], 2) + Math.pow(vertexPositions[i + 2], 2))));
        }
    }
}