import Cookies from "js-cookie";
import React from "react";

export const RangeSlider = (props: {
    cookieName: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
    inputRef?: React.RefObject<HTMLInputElement>
}) => {
    return (
        <input
            ref={props.inputRef}
            className="w-full"
            type='range'
            min={props.min}
            max={props.max}
            step={props.step}
            defaultValue={parseFloat(Cookies.get(props.cookieName) ?? props.value.toString())}
            onChange={e => {
                props.onChange(e.target.valueAsNumber);
                Cookies.set(props.cookieName, e.target.valueAsNumber.toString());
            }}
        />
    )
}