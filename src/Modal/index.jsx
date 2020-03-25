import React, { useEffect, useState } from "react";
import { FaTimes } from 'react-icons/fa';
import "./index.scss";

export default function Modal (props) {

    function handleClose() {
        props.modalStateHook(false);
    }

    return (
        <div className={`backdrop ${props.visible ? "visible" : "hidden"}`}>
            <div className="modal-box">
                <FaTimes className="closable" onClick={handleClose} />
                <span className="title">Add Image</span>
                <hr />
                <span className="subtitle">Local Image support coming soon...</span>
                {props.children}
                <hr />
                <div className="buttons">
                    {
                        props.buttons ? props.buttons.map(function (data, key) {
                            return <button key={key} onClick={data.onClick}>{data.text}</button>
                        }) : null
                    }
                </div>
            </div>
        </div>
    )
}