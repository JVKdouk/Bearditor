import React, { useRef, useState, useImperativeHandle, forwardRef } from "react";

import { AtomicBlockUtils, EditorState, KeyBindingUtil, Modifier, RichUtils, convertToRaw } from 'draft-js';
import createImagePlugin from 'draft-js-image-plugin';
import Editor from 'draft-js-plugins-editor';

import { FaBold, FaFileImage, FaHighlighter, FaItalic, FaStrikethrough, FaUnderline } from 'react-icons/fa';
import Modal from './Modal/index.jsx';

import 'draft-js/dist/Draft.css';
import "draft-js-image-plugin/lib/plugin.css";
import "./index.scss";

const KDitorJS = forwardRef( (props, ref) => {

    /* Editor Related States */

    const [editorState, setEditorState] = useState(EditorState.createEmpty());
    const [placeholder, setPlaceholder] = useState(null);
    const editorRef = useRef(null);


    /* Editor Modal Related States */

    const [imageModalVisibility, setImageModalVisibility] = useState(false);
    const [imageModalURL, setImageModalURL] = useState("");


    /* Enum Requirements */

    const actionShortcuts = require("./enums/actionShortcuts.json");

    const toolbarOptions = {
        items: {
            "BOLD": { icon: <FaBold /> },
            "ITALIC": { icon: <FaItalic /> },
            "STRIKETHROUGH": { icon: <FaStrikethrough /> },
            "HIGHLIGHT": { icon: <FaHighlighter /> },
            "UNDERLINE": { icon: <FaUnderline /> },
            "SELECT": {
                label: "Blocktype", items: [
                    { label: "Normal", value: "NORMAL" },
                    { label: "Title", value: "TITLE" },
                    { label: "Code", value: "CODE" },
                    { label: "Observation", value: "OBSERVATION" },
                    { label: "Quote", value: "QUOTE" },
                ]
            },
            "IMAGE": { label: "Add Image", icon: <FaFileImage />, type: "custom", onClick: () => { setImageModalVisibility(true); } },
        }
    }

    const blockMap = {
        "TITLE": "title-style",
        "OBSERVATION": "observation-style",
        "CODE": "code-style",
        "QUOTE": "quote-style",
        "NORMAL": "normal-style"
    }

    const styleMap = {
        "HIGHLIGHT": {
            backgroundColor: "#01a4a456"
        }
    };


    /* Default Editor Functions */

    const insertImage = (editorState, base64) => {
        const contentState = editorState.getCurrentContent();
        const contentStateWithEntity = contentState.createEntity(
            'image',
            'IMMUTABLE',
            { src: base64 },
        );
        const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
        const newEditorState = EditorState.set(
            editorState,
            { currentContent: contentStateWithEntity },
        );
        return AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' ');
    };

    const handleImageInsertion = (src) => {
        const newState = insertImage(editorState, imageModalURL);
        setEditorState(newState);
    }

    function blockStyleFn(contentBlock) {
        const blockStyle = blockMap[contentBlock.getType()];

        if (blockStyle) return blockStyle;
        else return "normal-style"
    }

    function handleKeyCommand(command) {
        let newState;
        const selectedShortcut = actionShortcuts[command];

        if (selectedShortcut) {
            if (selectedShortcut["type"] === "block") {
                newState = RichUtils.toggleBlockType(editorState, selectedShortcut["value"]);
            } else {
                newState = RichUtils.toggleInlineStyle(editorState, selectedShortcut["value"]);
            }
        } else if (command === "soft-new-line") {
            newState = RichUtils.insertSoftNewline(editorState);
        } else if (command === "tab") {
            newState = Modifier.replaceText(
                editorState.getCurrentContent(),
                editorState.getSelection(),
                tabCharacter
            );

            setEditorState(EditorState.push(editorState, newState, 'insert-characters'));
            return "handled";
        } else {
            return 'not-handled';
        }

        setEditorState(newState);
        return "handled";
    }

    function handleKeyShortcut(e) {
        const shortcut = actionShortcuts[e.keyCode];
        if (hasCommandModifier(e) && shortcut) {
            return e.keyCode;
        }

        if (e.keyCode === 13 /* "Shift" + "Enter" key -> Soft new line */) {
            if (e.nativeEvent.shiftKey) {
                return "soft-new-line";
            }
        }

        if (e.keyCode === 9 /* "Tab" key */) {
            return "tab";
        }
    }

    /* Editor Initalization */

    // Plugins
    const imagePlugin = createImagePlugin();


    // Editor Props
    const { hasCommandModifier } = KeyBindingUtil;

    // Miscelaneous
    const tabCharacter = "    ";

    const shortcutKeyList = Object.keys(actionShortcuts);
    if (!placeholder && props.showPlaceholder) {
        setPlaceholder(`Start your article by clicking here...${shortcutKeyList.map(key => {
            const item = actionShortcuts[key];
            return `\n Ctrl + ${String.fromCharCode(key)} -> ${item.fn}`
        }).join("")}`);
    }

    const selection = editorState.getSelection();
    const blockType = editorState.getCurrentContent().getBlockForKey(selection.getStartKey()).getType();

    const inlineStyle = editorState.getCurrentInlineStyle();


    /* Post-Initialization: User Custom Props Processing */

    props.customStyles.map(data => {

        // Set Style Map or Block Style
        if (data.type === "block") {
            blockMap[data.name] = data.className;
        } else if (data.type === "inline") {
            styleMap[data.name] = data.style;
        }

        const toolbarOption = {};
        toolbarOption["label"] = data.name;
        toolbarOption["dropdown"] = data.dropdown;
        toolbarOption["items"] = data.items;
        toolbarOption["icon"] = data.icon;
        toolbarOption["type"] = data.type;
        toolbarOption["onClick"] = (data.type === "custom") ? data.onClick : undefined;
        toolbarOptions.items[data.name] = toolbarOption;

        if (data.secondKey) {
            const shortcutAction = {};
            shortcutAction["fn"] = data.fn;
            shortcutAction["type"] = data.type;
            shortcutAction["value"] = data.name;
            actionShortcuts[data.secondKey.charCodeAt(0)] = shortcutAction;
        }

        return true;
    });

    const toolbarOptionsKeys = Object.keys(toolbarOptions.items);


    /* Pre-Render: Components Definition */

    const Toolbar = (props) => {
        const toolbarTheme = props.theme ? props.theme : {};

        return (
            <div className="editor-toolbar" style={toolbarTheme["wrapper"]}>

                {toolbarOptionsKeys.map((data) => {
                    const item = toolbarOptions.items[data];

                    if (data === "SELECT") {
                        return (
                            <select
                                key={data}
                                value={blockType}
                                onChange={(e) => { setEditorState(RichUtils.toggleBlockType(editorState, e.target.value)); }}
                                className="editor-select"
                                style={toolbarTheme["select"]}>
                                {item.items.map((options) => {
                                    return <option key={options.value} value={options.value}>{options.label}</option>
                                })}
                            </select>
                        )
                    } else {
                        const onClick = (item.type === "custom") ? item.onClick :
                            (e) => { e.preventDefault(); setEditorState(RichUtils.toggleInlineStyle(editorState, data)); }

                        const className = item.type === "custom" ?
                            "editor-button" : `editor-button ${inlineStyle.has(data) ? "selected" : ""}`

                        return (
                            <button
                                key={data}
                                onMouseDown={onClick}
                                className={className}
                                style={toolbarTheme["button"]}>
                                {item.icon}
                            </button>
                        )
                    }

                })}

            </div>
        )
    }

    /* Editor Rendering */


    useImperativeHandle(ref, () => ({
        deserialize () {
            const contentState = editorState.getCurrentContent();
            return convertToRaw(contentState);
        }
    }));

    return (
        <div className="full-wrapper">
            <Toolbar theme={props.theme.toolbar} />
            <div className={`editor-wrapper ${props.contentAlign ? props.contentAlign : "left"}`} onClick={() => { editorRef.current.focus(); setPlaceholder(""); }} >
                <Editor
                    plugins={[imagePlugin]}
                    keyBindingFn={handleKeyShortcut}
                    blockStyleFn={blockStyleFn}
                    customStyleMap={styleMap}
                    id="editor"
                    placeholder={placeholder}
                    handleKeyCommand={handleKeyCommand}
                    ref={editorRef}
                    editorState={editorState}
                    onChange={setEditorState}
                />

            </div>

            <Modal modalStateHook={setImageModalVisibility} visible={imageModalVisibility} buttons={[{ text: "Add", onClick: () => { setImageModalVisibility(false); handleImageInsertion(imageModalURL); } }]}>
                <input onChange={(e) => { setImageModalURL(e.target.value) }} placeholder="URL to Image..." />
            </Modal>
        </div>
    );
});

KDitorJS.defaultProps = {
    showPlaceholder: true,
    customStyles: [],
    theme: {
        "editor": {},
        "toolbar": {}
    }
};

export default KDitorJS;