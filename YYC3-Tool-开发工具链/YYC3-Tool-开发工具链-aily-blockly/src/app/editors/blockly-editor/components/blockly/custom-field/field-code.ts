import * as Blockly from 'blockly/core';
import * as monaco from 'monaco-editor';

/**
 * Class for a Monaco Editor field.
 * @extends {Blockly.Field}
 */
class FieldMonacoEditor extends Blockly.FieldTextInput {
    language_: any;
    editorHeight_: any;
    editorWidth_: any;
    editor_: any;
    editorDiv_: any;
    outerDiv_: any;
    tooltip_: any;
    /**
     * Class for an editable Monaco editor field.
     * @param {string=} opt_value The initial value of the field. Default empty string.
     * @param {Object=} opt_options Configuration options.
     * @param {string=} opt_options.language The language for the editor (e.g., 'javascript', 'python'). Default 'javascript'.
     * @param {number=} opt_options.height The height of the editor. Default 300.
     * @param {number=} opt_options.width The width of the editor. Default 400.
     * @param {Function=} opt_validator A function that is called to validate changes.
     * @constructor
     */
    constructor(opt_value = '', opt_options: any = {}, opt_validator) {
        super(opt_value, opt_validator);

        /**
         * The language for Monaco editor.
         * @type {string}
         * @private
         */
        this.language_ = opt_options.language || 'javascript';

        /**
         * The height of the editor.
         * @type {number}
         * @private
         */
        this.editorHeight_ = opt_options.height || 300;

        /**
         * The width of the editor.
         * @type {number}
         * @private
         */
        this.editorWidth_ = opt_options.width || 400;

        /**
         * Monaco editor instance
         * @type {monaco.editor.IStandaloneCodeEditor}
         * @private
         */
        this.editor_ = null;

        /**
         * The HTML element containing the editor.
         * @type {HTMLElement}
         * @private
         */
        this.editorDiv_ = null;

        /**
         * The outer div wrapping the editor for positioning.
         * @type {HTMLElement}
         * @private
         */
        this.outerDiv_ = null;

        /**
         * Tooltip text for this field.
         * @type {string}
         * @private
         */
        this.tooltip_ = opt_options.tooltip || '';
    }

    /**
     * Construct a FieldMonacoEditor from a JSON arg object.
     * @param {!Object} options A JSON object with options.
     * @return {!FieldMonacoEditor} The new field instance.
     * @package
     * @nocollapse
     */
    static override fromJson(options) {
        const text = Blockly.utils.parsing.replaceMessageReferences(options.text);
        return new this(text, undefined, options);
    }

    /**
     * Show the inline free-text editor on top of the text with the editor setup.
     * @param {!Event=} e Optional mouse event that triggered the field to open, 
     *    or undefined if triggered programmatically.
     * @param {boolean=} _quietInput Not used.
     * @protected
     * @override
     */
    override showEditor_(e = undefined, _quietInput = undefined) {
        // Not focusing; we'll handle this ourselves
        // this.showInlineEditor_(false);

        // Build the DOM.
        this.outerDiv_ = document.createElement('div');
        this.outerDiv_.className = 'blocklyMonacoEditorWrapper';
        const style = this.outerDiv_.style;
        style.position = 'absolute';
        style.backgroundColor = 'white';
        style.border = '1px solid #ddd';
        style.boxShadow = '0 0 8px 2px rgba(0, 0, 0, 0.2)';
        style.zIndex = 100;

        // Create header with done button
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.padding = '6px';
        header.style.backgroundColor = '#f3f3f3';
        header.style.borderBottom = '1px solid #ddd';

        const title = document.createElement('div');
        title.innerText = 'Edit Code';
        title.style.fontWeight = 'bold';
        header.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.innerText = '✓ Done';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.border = 'none';
        closeBtn.style.backgroundColor = '#4CAF50';
        closeBtn.style.color = 'white';
        closeBtn.style.padding = '4px 8px';
        closeBtn.style.borderRadius = '3px';
        closeBtn.addEventListener('click', () => this.closeEditor_(true));
        header.appendChild(closeBtn);

        this.outerDiv_.appendChild(header);

        // Create editor div
        this.editorDiv_ = document.createElement('div');
        this.editorDiv_.style.width = this.editorWidth_ + 'px';
        this.editorDiv_.style.height = this.editorHeight_ + 'px';
        this.outerDiv_.appendChild(this.editorDiv_);

        document.body.appendChild(this.outerDiv_);

        // Position the editor correctly
        const blockPosition = this.getAbsoluteXY_();
        // const windowSize = Blockly.utils.svgSize(this.sourceBlock_.workspace.getParentSvg());
        // if (blockPosition.y > windowSize.height / 2) {
        //     this.outerDiv_.style.top = (blockPosition.y - this.editorHeight_ - 40) + 'px';
        // } else {
        //     this.outerDiv_.style.top = (blockPosition.y + 40) + 'px';
        // }
        this.outerDiv_.style.left = blockPosition.x + 'px';

        // Create and initialize the Monaco editor
        this.editor_ = monaco.editor.create(this.editorDiv_, {
            value: this.getValue() || '',
            language: this.language_,
            theme: 'vs',
            minimap: { enabled: false },
            automaticLayout: true,
            scrollBeyondLastLine: false,
            contextmenu: true,
            lineNumbers: 'on',
        });

        // Focus the editor
        this.editor_.focus();

        // Add event listener to close the editor when clicking outside
        setTimeout(() => {
            const onDocumentClick = (e) => {
                if (!this.outerDiv_.contains(e.target)) {
                    document.removeEventListener('mousedown', onDocumentClick);
                    this.closeEditor_(true);
                }
            };
            document.addEventListener('mousedown', onDocumentClick);
        }, 100);

        // Prevent default handling
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * Close the editor, save the results, and dispose of any events.
     * @param {boolean} saveValue Whether to save the editor contents to this field
     * @private
     */
    closeEditor_(saveValue) {
        if (this.editor_) {
            if (saveValue) {
                const value = this.editor_.getValue();
                this.setValue(value);
            }
            this.editor_.dispose();
            this.editor_ = null;
        }
        if (this.outerDiv_) {
            document.body.removeChild(this.outerDiv_);
            this.outerDiv_ = null;
            this.editorDiv_ = null;
        }
    }

    /**
     * Updates the field's value based on the given value.
     * @param {*} newValue The value to be saved.
     * @protected
     * @override
     */
    override doValueUpdate_(newValue) {
        super.doValueUpdate_(newValue);
        this.isDirty_ = true;
    }

    /**
     * Handle a mouse down event on a field.
     * @param {!Event} e Mouse down event.
     * @protected
     * @override
     */
    override onMouseDown_(e) {
        if (this.sourceBlock_ && !this.sourceBlock_.isEditable()) {
            return;
        }
        this.showEditor_(e);
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Get the text from this field's value to display on the block.
     * @return {string} The code snippet preview to display.
     * @protected
     * @override
     */
    override getText_() {
        const value = this.getValue() || '';
        const maxLength = 30;
        // Display a snippet of the code (first line or truncated if too long)
        let text = value.split('\n')[0] || '';
        if (text.length > maxLength) {
            text = text.substring(0, maxLength) + '...';
        }

        if (value.includes('\n')) {
            text += ' [...]';
        }

        return text || '[Empty]';
    }

    /**
     * Ensure that the input value is a string.
     * @param {*} newValue The input value.
     * @return {string} A string representing the value.
     * @protected
     * @override
     */
    override doClassValidation_(newValue) {
        if (newValue === null || newValue === undefined) {
            return '';
        }
        return String(newValue);
    }

    /**
     * Get the tooltip for this field.
     * @return {string} The tooltip text.
     * @public
     * @override
     */
    override getTooltip() {
        return this.tooltip_;
    }

    /**
     * Clean up this FieldMonacoEditor, including Monaco editor.
     * @protected
     * @override
     */
    override dispose() {
        if (this.editor_) {
            this.editor_.dispose();
            this.editor_ = null;
        }
        if (this.outerDiv_ && this.outerDiv_.parentNode) {
            this.outerDiv_.parentNode.removeChild(this.outerDiv_);
        }
        super.dispose();
    }
}

// Register the field
Blockly.fieldRegistry.register('field_monaco_editor', FieldMonacoEditor);
