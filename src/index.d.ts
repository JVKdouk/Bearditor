import React from 'react';

interface customStyleProps {
    style?: string | object;
    name: string;
    type: "block" | "inline" | "custom";
    onClick: function;
    fn?: string;
    dropdown?: boolean;
    icon?: React.Component;
    items?: object[];
}

declare export interface EditorProps {
    contentAlign?: "left" | "center";
    showPlaceholder?: boolean;
    customStyles?: customStyleProps;
}

declare const Editor: React.SFC<EditorProps>

export default Editor;