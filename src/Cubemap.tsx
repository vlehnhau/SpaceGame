import NegativeX from './../resources/CubemapTextures/NegativeX.png'
import PositiveX from './../resources/CubemapTextures/PositiveX.png'
import NegativeY from './../resources/CubemapTextures/NegativeY.png'
import PositiveY from './../resources/CubemapTextures/PositiveY.png'
import NegativeZ from './../resources/CubemapTextures/NegativeZ.png'
import PositiveZ from './../resources/CubemapTextures/PositiveZ.png'

const CubemapTextures = [
    NegativeX,
    PositiveX,
    NegativeY,
    PositiveY,
    NegativeZ,
    PositiveZ
];

export const createCubemap = async (gl: WebGL2RenderingContext): Promise<WebGLTexture> => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    let imageCt = 0;

    const load = async (url, target, tex: WebGLTexture) => {
        const img = new Image();
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                imageCt++;
                if (imageCt == 6) {
                    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                }
                resolve();
            }
            img.onerror = function () {
                console.log(url, 'not found.');
                reject();
            }
            img.src = url;
        })
    }

    await load(CubemapTextures[0], gl.TEXTURE_CUBE_MAP_NEGATIVE_X, texture);
    await load(CubemapTextures[1], gl.TEXTURE_CUBE_MAP_POSITIVE_X, texture);
    await load(CubemapTextures[2], gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, texture);
    await load(CubemapTextures[3], gl.TEXTURE_CUBE_MAP_POSITIVE_Y, texture);
    await load(CubemapTextures[4], gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, texture);
    await load(CubemapTextures[5], gl.TEXTURE_CUBE_MAP_POSITIVE_Z, texture);

    return texture;
}