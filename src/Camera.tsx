import { Matrix3, Matrix4, Vector3 } from "@math.gl/core";
import { normalMatrix } from "./Utility";

export class Camera {
    position: Vector3;
    viewDirection: Vector3;

    private pitch: number;
    private yaw: number;
    private zoom: number;

    projectionMatrix: Matrix4;
    viewDirectionRotationMatrix: Matrix3;

    constructor(pitch: number, yaw: number, zoom: number) {
        this.viewDirection = new Vector3();

        this.zoom = zoom;
        this.pitch = pitch;
        this.yaw = yaw;

        this.projectionMatrix = new Matrix4().identity();

        this.updateViewDirection();
    }

    getPitch(): number {
        return this.pitch;
    }

    getYaw(): number {
        return this.yaw;
    }

    setRotation(pitch: number, yaw: number) {
        this.pitch = pitch;
        this.yaw = yaw;

        this.updateViewDirection();
    }

    getZoom(): number {
        return this.zoom;
    }

    setZoom(zoom: number) {
        this.zoom = zoom;

        this.updateViewDirection();
    }

    updateViewDirection() {
        this.viewDirection.x = Math.cos(this.pitch) * Math.cos(this.yaw);
        this.viewDirection.y = Math.sin(this.pitch);
        this.viewDirection.z = Math.cos(this.pitch) * Math.sin(this.yaw);
        this.viewDirection.normalize();

        const xyDir = new Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));

        this.position = xyDir.scale(-this.zoom);

        this.updateViewDirectionRotationMatrix();
    }

    updateViewDirectionRotationMatrix() {
        this.viewDirectionRotationMatrix = normalMatrix(new Matrix4().lookAt({
            eye: this.position,
            center: new Vector3().addVectors(this.position, this.viewDirection),
            up: new Vector3(0, 1, 0)
        }));
    }

    updateProjectionMatrix(aspectRatio: number) {
        this.projectionMatrix.setElement(1, 1, aspectRatio);
    }
};


// // Returns true if the camera moved
// const executeMovement = (context: AppContext): boolean => {
//     const oldCameraPos = new Vector3(context.camera.position);

//     const xyDir = new Vector3(-Math.cos(context.cameraYaw), 0, Math.sin(context.cameraYaw));
    
//     if (context.keyPressedMap['w']) {            
//         context.cameraPos.addScaledVector(xyDir, context.movementSpeed);
//     }
//     else if (context.keyPressedMap['s']) {
//         context.cameraPos.addScaledVector(xyDir, -context.movementSpeed);
//     }

//     if (context.keyPressedMap['a']) {
//         const rightVec = new Vector3(0, 1, 0).cross(xyDir);
//         context.cameraPos.addScaledVector(rightVec, context.movementSpeed);
//     }
//     else if (context.keyPressedMap['d']) {
//         const rightVec = new Vector3(0, 1, 0).cross(xyDir);
//         context.cameraPos.addScaledVector(rightVec, -context.movementSpeed);
//     }

//     if (context.keyPressedMap['v']) {
//         context.cameraPos.y -= context.movementSpeed;
//     }
//     else if (context.keyPressedMap[' ']) {
//         context.cameraPos.y += context.movementSpeed;
//     }

//     return !oldCameraPos.exactEquals(context.cameraPos);
// }