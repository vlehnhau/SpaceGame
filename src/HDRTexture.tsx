import parseHDR from "parse-hdr";

export type HDRImage = {
    data: Float32Array;
    exposure: number;
    gamma: number;
    shape: [number, number];
}

export const createHDRTexture = async (gl: WebGL2RenderingContext, hdrTextureUrl: string, textureTarget: number): Promise<WebGLTexture> => {
    const result = await fetch(hdrTextureUrl);
    const buffer = await result.arrayBuffer();
    const image  = await parseHDR(buffer) as HDRImage;

    const hdrTexture = gl.createTexture();
    gl.activeTexture(textureTarget);
    gl.bindTexture(gl.TEXTURE_2D, hdrTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    gl.texImage2D(gl.TEXTURE_2D, 
        0, 
        gl.RGBA32F, 
        image.shape[0], 
        image.shape[1], 
        0, 
        gl.RGBA, 
        gl.FLOAT, 
        image.data);

    return hdrTexture;
}