import Cookies from "js-cookie";
import React from "react";

export const RangeSlider = (props: {
    cookieName: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void
}) => {
    let defaultValue = props.value;
    if (props.cookieName) {
        defaultValue = parseFloat(Cookies.get(props.cookieName));
    }
    return (
        <input
            className="w-full"
            type='range'
            min={props.min}
            max={props.max}
            step={props.step}
            defaultValue={defaultValue}
            onChange={e => {
                props.onChange(e.target.valueAsNumber);
                Cookies.set(props.cookieName, e.target.valueAsNumber.toString());
            }}
        />
    )
}