import { Vector3 } from "@math.gl/core";
import * as comp from "./Components";

export interface Entity {
    components: Array<comp.Component>;
}

export class Player implements Entity {
    components: Array<comp.Component>;

    constructor(pos: Vector3) {
        this.components.push(new comp.PhysicsComp(pos, new Vector3(0)))
    }
}

export class Asteroid implements Entity {
    components: Array<comp.Component>;

    constructor() {
        //renderComp = new comp.RenderComp()
    }
}