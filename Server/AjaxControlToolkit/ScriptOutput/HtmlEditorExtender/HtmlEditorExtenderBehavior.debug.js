// (c) 2010 CodePlex Foundation
/// <reference name='MicrosoftAjax.js' />
/// <reference path='../ExtenderBase/BaseScripts.js' />
/// <reference path='../Common/Common.js' />

(function () {

    var scriptName = 'HtmlEditorExtenderBehavior';

    function execute() {
        Type.registerNamespace('Sys.Extended.UI');

        Sys.Extended.UI.HtmlEditorExtenderBehavior = function (element) {
            /// <summary>
            /// Html Extender behavior which Extends TextBox
            /// </summmary>
            /// <param name='element' type='Sys.UI.DomElement'>The element to attach to</param>
            Sys.Extended.UI.HtmlEditorExtenderBehavior.initializeBase(this, [element]);
            this._textbox = Sys.Extended.UI.TextBoxWrapper.get_Wrapper(element);

            var id = this.get_id();

            this._backColor = null;
            this._foreColor = null;
            this._commandName = null;
            this.savedRange = null;
            this.isInFocus = null;
            _flag = false;

            this._ButtonWidth = 23;
            this._ButtonHeight = 21;

            this._containerTemplate = {
                nodeName: 'div',
                properties: {
                    id: id + '_ExtenderContainer'
                },
                cssClasses: ['unselectable', 'ajax__html_editor_extender_container']
            };

            this._editableTemplate = {
                nodeName: 'div',
                properties: {
                    id: id + '_ExtenderContentEditable',
                    style: {
                        width: '100%',
                        height: '80%',
                        overflow: 'auto',
                        clear: 'both'
                    },
                    contentEditable: true
                },
                cssClasses: ['ajax__html_editor_extender_texteditor']
            };

            this._buttonTemplate = {
                nodeName: 'input',
                properties: {
                    type: 'button',
                    style: {
                        width: this._ButtonWidth + 'px',
                        height: this._ButtonHeight + 'px'
                    }
                },
                cssClasses: ['ajax__html_editor_extender_button']
            };

            this._textboxTemplate = {
                nodeName: 'input',
                properties: {
                    type: 'text'
                }
            };

            this._dropDownTemplate = {
                nodeName: 'select',
                properties: {
                    style: {
                        width: this._ButtonWidth + 'px',
                        height: this._ButtonHeight + 'px'
                    }
                },
                cssClasses: ['ajax__html_editor_extender_button']
            };

            this._topButtonContainerTemplate = {
                nodeName: 'div',
                properties: {
                    id: id + '_ExtenderButtonContainer'
                },
                cssClasses: ['ajax__html_editor_extender_buttoncontainer']
            };

            this._container = null;
            this._toolbarButtons = null;
            this._editableDiv = null;
            this._topButtonContainer = null;
            this._buttons = [];
            this._btnClickHandler = null;
            this._requested_buttons = new Array();
            this._colorPicker = null;
            this._txtBoxForColor = null;

            if ((typeof (WebForm_OnSubmit) == 'function') && !Sys.Extended.UI.HtmlEditorExtenderBehavior._originalWebForm_OnSubmit) {
                Sys.Extended.UI.HtmlEditorExtenderBehavior._originalWebForm_OnSubmit = WebForm_OnSubmit;
                WebForm_OnSubmit = Sys.Extended.UI.HtmlEditorExtenderBehavior.WebForm_OnSubmit;
            }
        }

        Sys.Extended.UI.HtmlEditorExtenderBehavior.prototype = {
            initialize: function () {
                Sys.Extended.UI.HtmlEditorExtenderBehavior.callBaseMethod(this, 'initialize');

                var idx = 0;
                this._button_list = new Array();
                this._createContainer();
                this._createTopButtonContainer();
                this._createEditableDiv();
                this._createButton();

                var formElement = this._textbox._element.parentNode;
                while (formElement != null && formElement.nodeName != 'FORM') {
                    formElement = formElement.parentNode;
                }

                if (formElement == null)
                    throw 'Missing Form tag';

                var delTextBox_onblur = Function.createDelegate(this, this._textBox_onblur);
                var delEditableDiv_onblur = Function.createDelegate(this, this._editableDiv_onblur);
                var btnClickHandler = Function.createDelegate(this, this._executeCommand);

                $addHandler(this._textbox._element, 'blur', delTextBox_onblur, true);
                $addHandler(this._editableDiv, 'blur', delEditableDiv_onblur, true);
                $addHandler(this._topButtonContainer, 'click', btnClickHandler);
            },

            _dispose: function () {
                $removeHandler(this._textbox._element, 'blur', delTextBox_onblur);
                $removeHandler(this._editableDiv, 'blur', delEditableDiv_onblur);
                $removeHandler(_topButtonContainer, 'click', btnClickHandler);

                Sys.Extended.UI.HtmlEditorExtenderBehavior.callBaseMethod(this, 'dispose');
            },

            _createContainer: function () {
                var e = this.get_element();
                this._container = $common.createElementFromTemplate(this._containerTemplate, e.parentNode);

                var bounds = $common.getBounds(this._textbox._element);
                $common.setSize(this._container, {
                    width: bounds.width,
                    height: bounds.height
                });

                $common.wrapElement(this._textbox._element, this._container, this._container);
            },

            _createTopButtonContainer: function () {
                this._topButtonContainer = $common.createElementFromTemplate(this._topButtonContainerTemplate, this._container);
            },

            _createButton: function () {
                for (i = 0; i < this._toolbarButtons.length; i++) {
                    var _btn;
                    if (this._toolbarButtons[i].CommandName == 'HorizontalSeparator') {
                        _btn = $common.createElementFromTemplate({
                            nodeName: "span",
                            cssClasses: ['ajax__html_editor_extender_separator']
                        }, this._topButtonContainer);
                    }
                    else if (this._toolbarButtons[i].CommandName == 'FontName') {
                        _btn = $common.createElementFromTemplate({
                            nodeName: "nobr",
                            properties: {
                                style: {
                                    cssFloat: 'left',
                                    fontSize: '11px'
                                }
                            },
                            children: [{
                                nodeName: "span",
                                properties: {
                                    textContent: "Font ",
                                    style: {
                                        paddingLeft: '5px',
                                        fontWeight: 'bold'
                                    }
                                }
                            }]
                        }, this._topButtonContainer);

                        _select = $common.createElementFromTemplate({
                            nodeName: "select",
                            properties: {
                                style: {
                                    fontSize: '11px',
                                    fontFamily: 'Arial',
                                    height: "20px",
                                    width: '115px'
                                }
                            },
                            events: {
                                change: function (e) {
                                    document.execCommand("FontName", false, this.options[this.selectedIndex].value);
                                }
                            }
                        }, _btn);

                        var option = [
                            { Text: "Arial", Value: "arial,helvetica,sans-serif" },
                            { Text: "Courier New", Value: "courier new,courier,monospace" },
                            { Text: "Georgia", Value: "georgia,times new roman,times,serif" },
                            { Text: "Tahoma", Value: "tahoma,arial,helvetica,sans-serif" },
                            { Text: "Times New Roman", Value: "times new roman,times,serif" },
                            { Text: "Verdana", Value: "verdana,arial,helvetica,sans-serif" },
                            { Text: "Impact", Value: "impact" },
                            { Text: "WingDings", Value: "wingdings" }
                            ];

                        for (x in option) {
                            var elOptNew = document.createElement('option');
                            elOptNew.text = option[x].Text;
                            elOptNew.value = option[x].Value;
                            try {
                                _select.add(elOptNew, null); // standards compliant; doesn't work in IE
                            }
                            catch (ex) {
                                _select.add(elOptNew); // IE only
                            }
                        }

                        _select.setAttribute('id', this._id + this._toolbarButtons[i].CommandName);
                        _select.setAttribute('name', this._toolbarButtons[i].CommandName);
                        _select.setAttribute('title', this._toolbarButtons[i].Tooltip);
                        _select.setAttribute('unselectable', 'on');
                    }
                    else if (this._toolbarButtons[i].CommandName == 'FontSize') {
                        _btn = $common.createElementFromTemplate({
                            nodeName: "nobr",
                            properties: {
                                style: {
                                    cssFloat: 'left',
                                    fontSize: '11px'
                                }
                            },
                            children: [{
                                nodeName: "span",
                                properties: {
                                    textContent: "Size ",
                                    style: {
                                        paddingLeft: '5px',
                                        fontWeight: 'bold'
                                    }
                                }
                            }]
                        }, this._topButtonContainer);

                        _select = $common.createElementFromTemplate({
                            nodeName: "select",
                            properties: {
                                style: {
                                    fontSize: '11px',
                                    fontFamily: 'Arial',
                                    height: "20px",
                                    width: '50px'
                                }
                            },
                            events: {
                                change: function (e) {
                                    document.execCommand("FontSize", false, this.options[this.selectedIndex].value);
                                }
                            }
                        }, _btn);

                        var option = [
                            { Text: "1 (8 pt)", Value: "8pt" },
                            { Text: "2 (10 pt)", Value: "10pt" },
                            { Text: "3 (12 pt)", Value: "12pt" },
                            { Text: "4 (14 pt)", Value: "14pt" },
                            { Text: "5 (18 pt)", Value: "18pt" },
                            { Text: "6 (24 pt)", Value: "24pt" },
                            { Text: "7 (36 pt)", Value: "36pt" }
                            ];

                        for (x in option) {
                            var elOptNew = document.createElement('option');
                            elOptNew.text = option[x].Text;
                            elOptNew.value = option[x].Value;
                            try {
                                _select.add(elOptNew, null); // standards compliant; doesn't work in IE
                            }
                            catch (ex) {
                                _select.add(elOptNew); // IE only
                            }
                        }

                        _select.setAttribute('id', this._id + this._toolbarButtons[i].CommandName);
                        _select.setAttribute('name', this._toolbarButtons[i].CommandName);
                        _select.setAttribute('title', this._toolbarButtons[i].Tooltip);
                        _select.setAttribute('unselectable', 'on');
                    }
                    else if (this._toolbarButtons[i].CommandName == 'ForeColor') {

                        _btn = $common.createElementFromTemplate({
                            nodeName: "span",
                            properties: {
                                style: {
                                    backgroundColor: '#ff0000',
                                    border: 'solid 1px #c2c2c2',
                                    display: 'block',
                                    cssFloat: 'left'
                                }
                            }
                        }, this._topButtonContainer);
                        _btn.setAttribute('unselectable', 'on');

                        this._foreColor = $common.createElementFromTemplate({
                            nodeName: 'input',
                            properties: {
                                type: 'button',
                                id: this._id + this._toolbarButtons[i].CommandName,
                                name: this._toolbarButtons[i].CommandName,
                                title: this._toolbarButtons[i].Tooltip,
                                style: {
                                    backgroundColor: 'transparent',
                                    width: '21px',
                                    height: '19px'
                                }
                            },
                            cssClasses: ['ajax__html_editor_extender_button ajax__html_editor_extender_' + this._toolbarButtons[i].CommandName]
                        }, _btn);
                        this._foreColor.setAttribute('unselectable', 'on');

                        /*
                        this._foreColor = $common.createElementFromTemplate(this._buttonTemplate, _btn);
                        this._foreColor.setAttribute('id', this._id + this._toolbarButtons[i].CommandName);
                        this._foreColor.setAttribute('name', this._toolbarButtons[i].CommandName);
                        this._foreColor.setAttribute('title', this._toolbarButtons[i].Tooltip);
                        this._foreColor.setAttribute('style', "background-color:transparent;width:21px;height:19px");
                        this._foreColor.setAttribute('unselectable', 'on');
                        --------------------------------------------------
                        >>>>>>>> THIS CODE IS CAUSE AN ISSUES ON IE7
                        --------------------------------------------------
                        this._foreColor.setAttribute('class', 'ajax__html_editor_extender_button ajax__html_editor_extender_' + this._toolbarButtons[i].CommandName);
                        */
                    }
                    else {
                        var map = {
                            Copy: 1,
                            Cut: 1,
                            Paste: 1
                        }

                        if (Sys.Browser.agent != Sys.Browser.InternetExplorer && map[this._toolbarButtons[i].CommandName]) {
                        }
                        else {
                            _btn = $common.createElementFromTemplate({
                                nodeName: 'input',
                                properties: {
                                    type: 'button',
                                    id: this._id + this._toolbarButtons[i].CommandName,
                                    name: this._toolbarButtons[i].CommandName,
                                    title: this._toolbarButtons[i].Tooltip,
                                    style: {
                                        width: '23px',
                                        height: '21px'
                                    }
                                },
                                cssClasses: ['ajax__html_editor_extender_button ajax__html_editor_extender_' + this._toolbarButtons[i].CommandName]
                            }, this._topButtonContainer);
                            _btn.setAttribute('unselectable', 'on');
                        }
                        Array.add(this._buttons, _btn);
                    }
                }
            },

            _createEditableDiv: function () {
                this._editableDiv = $common.createElementFromTemplate(this._editableTemplate, this._container);
                this._editableDiv.innerHTML = this._textbox._element.value;
                $common.setVisible(this._textbox._element, false);
            },

            _editableDiv_onblur: function () {
                this._textbox._element.value = this._encodeHtml();
            },

            _textBox_onblur: function () {
                this._editableDiv.innerHTML = this._textbox._element.value;
            },
            _encodeHtml: function () {
                var html = this._editableDiv.innerHTML.replace(/&/ig, '&amp;').replace(/</ig, '&lt;').replace(/>/ig, '&gt;').replace(/\'/ig, '&quot;').replace(/\xA0/ig, '&nbsp;');
                html = html.replace(/&lt;STRONG&gt;/ig, '&lt;b&gt;').replace(/&lt;\/STRONG&gt;/ig, '&lt;/b&gt;').replace(/&lt;EM&gt;/ig, '&lt;i&gt;').replace(/&lt;\/EM&gt;/ig, '&lt;/i&gt;');
                return html;
            },
            _editableDiv_submit: function () {
                var char = 3;
                var sel = null;
                this._editableDiv.focus();
                if (Sys.Browser.agent != Sys.Browser.Firefox) {
                    if (document.selection) {
                        sel = document.selection.createRange();
                        sel.moveStart('character', char);
                        sel.select();
                    }
                    else {
                        sel = window.getSelection();
                        sel.collapse(this._editableDiv.firstChild, char);
                    }
                }

                this._textbox._element.value = this._encodeHtml();
            },

            _executeCommand: function (command) {
                if (command.target.name == undefined)
                    return;

                var isFireFox = Sys.Browser.agent == Sys.Browser.Firefox;
                var delcolorPicker_onchange = Function.createDelegate(this, this._colorPicker_onchange);

                if (isFireFox) {
                    document.execCommand('styleWithCSS', false, false);
                }

                var map = {
                    JustifyRight: 1,
                    JustifyLeft: 1,
                    JustifyCenter: 1,
                    JustifyFull: 1
                };

                if (map[command.target.name]) {
                    try {
                        document.execCommand(command.target.name, false, null);
                    }
                    catch (e) {
                        if (e && e.result == 2147500037) {
                            var range = window.getSelection().getRangeAt(0);
                            var dummy = document.createElement('div');

                            var restoreSelection = false;
                            dummy.style.height = '1px;';

                            if (range.startContainer.contentEditable == 'true') {
                                window.getSelection().collapseToEnd();
                                restoreSelection = true;
                            }

                            var ceNode = window.getSelection().getRangeAt(0).startContainer;

                            while (ceNode && ceNode.contentEditable != 'true')
                                ceNode = ceNode.parentNode;

                            if (!ceNode) throw 'Selected node is not editable!';

                            ceNode.insertBefore(dummy, ceNode.childNodes[0]);
                            document.execCommand(command.target.name, false, null);
                            dummy.parentNode.removeChild(dummy);

                            if (restoreSelection) {
                                window.getSelection().addRange(range);
                            }
                        }
                        else if (window.console && window.console.log) {
                            window.console.log(e);
                        }
                    }
                }
                else if (command.target.name == "createLink") {
                    var url = prompt('Please insert  URL', '');
                    if (url) {
                        document.execCommand('createLink', false, url);
                    }
                }
                else if (command.target.name == 'ForeColor') {
                    this._commandName = command.target.name;
                    this.saveSelection();
                    if (!this._foreColorPicker) {
                        this._foreColorPicker = $create(Sys.Extended.UI.ColorPickerBehavior, { 'unselectable': 'on' }, {}, {}, this._foreColor);
                        this._foreColorPicker.set_sample(this._foreColor.parentNode);
                        this._foreColorPicker.add_colorSelectionChanged(delcolorPicker_onchange);
                    }
                    this._foreColorPicker.show();
                }
                else if (command.target.name == 'UnSelect') {
                    if (isFireFox) {                                                
                        this._editableDiv.focus();
                        var sel = window.getSelection();
                        sel.collapse(this._editableDiv.firstChild, 0);
                    }
                    else {
                        document.execCommand(command.target.name, false, null);
                    }
                }
                else {
                    document.execCommand(command.target.name, false, null);
                }
            },

            _colorPicker_onchange: function (e) {
                this.restoreSelection();
                if (this._commandName == "backcolor") {
                    if (!document.execCommand("hilitecolor", false, "#" + e._selectedColor)) {
                        document.execCommand("backcolor", false, "#" + e._selectedColor);
                    }
                }
                else
                    document.execCommand(this._commandName, false, "#" + e._selectedColor);
            },

            saveSelection: function () {
                if (window.getSelection)//non IE Browsers
                {
                    this.savedRange = window.getSelection().getRangeAt(0);
                }
                else if (document.selection)//IE
                {
                    this.savedRange = document.selection.createRange();
                }
            },

            restoreSelection: function () {
                this.isInFocus = true;
                if (this.savedRange != null) {
                    if (window.getSelection)//non IE and there is already a selection
                    {
                        var s = window.getSelection();
                        if (s.rangeCount > 0)
                            s.removeAllRanges();
                        s.addRange(this.savedRange);
                    }
                    else {
                        if (document.createRange)//non IE and no selection
                        {
                            window.getSelection().addRange(this.savedRange);
                        }
                        else {
                            if (document.selection)//IE
                            {
                                this.savedRange.select();
                            }
                        }
                    }
                }
            },

            get_ButtonWidth: function () {
                return this._ButtonWidth;
            },

            set_ButtonWidth: function (value) {
                if (this._ButtonWidth != value) {
                    this._ButtonWidth = value;
                    this.raisePropertyChanged('ButtonWidth');
                }
            },

            get_ButtonHeight: function () {
                return this._ButtonHeight;
            },

            set_ButtonHeight: function (value) {
                if (this._ButtonHeight != value) {
                    this._ButtonHeight = value;
                    this.raisePropertyChanged('ButtonHeight');
                }
            },

            get_ToolbarButtons: function () {
                return this._toolbarButtons;
            },

            set_ToolbarButtons: function (value) {
                if (this._toolbarButtons != value) {
                    this._toolbarButtons = value;
                    this.raisePropertyChanged('ToolbarButtons');
                }
            }

        };

        Sys.Extended.UI.HtmlEditorExtenderBehavior.registerClass('Sys.Extended.UI.HtmlEditorExtenderBehavior', Sys.Extended.UI.BehaviorBase);
        Sys.registerComponent(Sys.Extended.UI.HtmlEditorExtenderBehavior, { name: 'HtmlEditorExtender', parameters: [{ name: 'ToolbarButtons', type: 'HtmlEditorExtenderButton[]'}] });

        Sys.Extended.UI.HtmlEditorExtenderBehavior.WebForm_OnSubmit = function () {
            /// <summary>
            /// Wraps ASP.NET's WebForm_OnSubmit in order to encode tags prior to submission
            /// </summary>
            /// <returns type='Boolean'>
            /// Result of original WebForm_OnSubmit
            /// </returns>
            var result = Sys.Extended.UI.HtmlEditorExtenderBehavior._originalWebForm_OnSubmit();
            if (result) {
                var components = Sys.Application.getComponents();
                for (var i = 0; i < components.length; i++) {
                    var component = components[i];
                    if (Sys.Extended.UI.HtmlEditorExtenderBehavior.isInstanceOfType(component)) {
                        component._editableDiv_submit();
                    }
                }
            }
            return result;
        }

    } // execute

    if (window.Sys && Sys.loader) {
        Sys.loader.registerScript(scriptName, ['ExtendedBase', 'ExtendedCommon'], execute);

    }
    else {
        execute();
    }

})();
