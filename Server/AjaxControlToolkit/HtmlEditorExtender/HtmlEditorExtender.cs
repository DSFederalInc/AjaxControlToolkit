﻿using System.Web.UI;
using System.Web.UI.WebControls;
using AjaxControlToolkit;
using System.ComponentModel;
using System.Text;
using System;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.ComponentModel.Design;
using System.Drawing.Design;
using System.IO;
using System.Reflection;
using AjaxControlToolkit.Sanitizer;
using System.Web.UI.HtmlControls;

[assembly: WebResource("HtmlEditorExtender.HtmlEditorExtenderBehavior.js", "text/javascript")]
[assembly: WebResource("HtmlEditorExtender.HtmlEditorExtenderBehavior.debug.js", "text/javascript")]
[assembly: WebResource("HtmlEditorExtender.HtmlEditorExtender_resource.css", "text/css", PerformSubstitution = true)]
[assembly: WebResource("HtmlEditorExtender.Images.html-editor-buttons.png", "img/png")]

namespace AjaxControlToolkit
{
    /// <summary>
    /// HtmlEditorExtender extends to a textbox and creates and renders an editable div 
    /// in place of targeted textbox.
    /// </summary>
    [TargetControlType(typeof(TextBox))]
    [RequiredScript(typeof(CommonToolkitScripts), 0)]
    [RequiredScript(typeof(ColorPickerExtender), 1)]
    [ClientScriptResource("Sys.Extended.UI.HtmlEditorExtenderBehavior", "HtmlEditorExtender.HtmlEditorExtenderBehavior.js")]
    [ClientCssResource("HtmlEditorExtender.HtmlEditorExtender_resource.css")]
    [ParseChildren(true)]
    [PersistChildren(false)]
    [System.Drawing.ToolboxBitmap(typeof(HtmlEditorExtender), "HtmlEditorExtender.html_editor_extender.ico")]
    [Designer(typeof(AjaxControlToolkit.HtmlEditorExtenderDesigner))]
    public class HtmlEditorExtender : ExtenderControlBase
    {
        internal const int ButtonWidthDef = 23;
        internal const int ButtonHeightDef = 21;
        private HtmlEditorExtenderButtonCollection buttonList = null;
        private SanitizerProvider sanitizerProvider = null;
        private AjaxFileUpload ajaxFileUpload = null;

        public HtmlEditorExtender()
        {
            EnableClientState = true;
            sanitizerProvider = Sanitizer.Sanitizer.GetProvider();
        }

        public SanitizerProvider SanitizerProvider
        {
            get { return this.sanitizerProvider; }
            set { this.sanitizerProvider = value; }
        }


        /// <summary>
        /// Provide button list to client side. Need help from Toolbar property 
        /// for designer experience support, cause Editor always blocks the property
        /// ability to provide values to client side as ExtenderControlProperty on run time.
        /// </summary>
        [PersistenceMode(PersistenceMode.InnerProperty)]
        [DesignerSerializationVisibility(DesignerSerializationVisibility.Hidden)]
        [Browsable(false)]
        [EditorBrowsable(EditorBrowsableState.Never)]
        [ExtenderControlProperty(true, true)]
        public HtmlEditorExtenderButtonCollection ToolbarButtons
        {
            get
            {
                EnsureButtons();
                return buttonList;
            }
        }

        /// <summary>
        /// Ensure Toolbar buttons are created. Only creates the buttons
        /// once no matter how many times called
        /// </summary>
        private void EnsureButtons()
        {
            if (buttonList == null || buttonList.Count == 0)
            {
                CreateButtons();
            }
        }


        /// <summary>
        /// Helper property to cacth buttons from modifed buttons on design time.
        /// This property will only attached when Toolbar property are not empty in design time.
        /// </summary>
        [PersistenceMode(PersistenceMode.InnerProperty)]
        [DesignerSerializationVisibility(DesignerSerializationVisibility.Visible)]
        [DefaultValue(null)]
        [NotifyParentProperty(true)]
        [Editor(typeof(HtmlEditorExtenderButtonCollectionEditor), typeof(UITypeEditor))]
        [Description("Costumize visible buttons, leave empty to show all buttons")]
        public HtmlEditorExtenderButtonCollection Toolbar
        {
            get
            {
                if (buttonList == null || buttonList.Count == 0)
                    buttonList = new HtmlEditorExtenderButtonCollection();
                return buttonList;
            }
        }

        /// <summary>
        /// Determines whether to display source view tab/button to see source view of the HtmlEditorExtender.
        /// </summary>
        [ExtenderControlProperty]
        [DefaultValue(false)]
        [ClientPropertyName("displaySourceTab")]
        public bool DisplaySourceTab
        {
            get { return GetPropertyValue("DisplaySourceTab", false); }
            set { SetPropertyValue("DisplaySourceTab", value); }
        }

        /// <summary>
        /// Name of client side function that will be called onchange in contents
        /// </summary>
        [ExtenderControlEvent]
        [ClientPropertyName("change")]
        [DefaultValue("")]
        public string OnClientChange
        {
            get { return GetPropertyValue<string>("OnClientChange", string.Empty); }
            set { SetPropertyValue<string>("OnClientChange", value); }
        }

        [Browsable(false)]
        public AjaxFileUpload AjaxFileUpload
        {
            get { return ajaxFileUpload; }
        }

        /// <summary>
        /// Decodes html tags those are not generated by any htmlEditorExtender button
        /// </summary>
        /// <param name="value">Value that contains html tags to decode</param>
        /// <returns>value after decoded</returns>
        public string Decode(string value)
        {
            EnsureButtons();

            string tags = "font|div|span|br|strong|em|strike|sub|sup|center|blockquote|hr|ol|ul|li|br|s|p|b|i|u";
            string attributes = "style|size|color|face|align|dir";
            string attributeCharacters = "\\'\\,\\w\\-#\\s\\:\\;";
            var result = Regex.Replace(value, "\\&quot\\;", "\"", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, "&apos;", "'", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, "(?:\\&lt\\;|\\<)(\\/?)((?:" + tags + ")(?:\\s(?:" + attributes + ")=\"[" + attributeCharacters + "]*\")*)(?:\\&gt\\;|\\>)", "<$1$2>", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            //for decoding a tags
            if (buttonList.Find(b => b.CommandName == "createLink") != null)
            {
                string hrefCharacters = "^\\\"\\>\\<\\\\";
                result = Regex.Replace(result, "(?:\\&lt\\;|\\<)(\\/?)(a(?:(?:\\shref\\=\\\"[" + hrefCharacters + "]*\\\")|(?:\\sstyle\\=\\\"[" + attributeCharacters + "]*\\\"))*)(?:\\&gt\\;|\\>)", "<$1$2>", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            }
            result = Regex.Replace(result, "&amp;", "&", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, "&nbsp;", "\xA0", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, "<[^>]*expression[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            result = Regex.Replace(result, "<[^>]*data\\:[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            result = Regex.Replace(result, "<[^>]*script[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            result = Regex.Replace(result, "<[^>]*filter[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            result = Regex.Replace(result, "<[^>]*behavior[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            result = Regex.Replace(result, "<[^>]*url[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            result = Regex.Replace(result, "<[^>]*javascript\\:[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);
            result = Regex.Replace(result, "<[^>]*position\\:[^>]*>", "_", RegexOptions.IgnoreCase | RegexOptions.ECMAScript);

            if (sanitizerProvider != null)
            {
                result = sanitizerProvider.GetSafeHtmlFragment(result);
            }

            return result;
        }

        /// <summary>
        /// On Init add popup div and ajaxfileupload control to support Add image
        /// </summary>
        /// <param name="e">Event Arguments</param>
        protected override void OnInit(EventArgs e)
        {
            base.OnInit(e);

            HtmlGenericControl popupdiv = new HtmlGenericControl("div");
            popupdiv.Attributes.Add("Id", this.ClientID + "_popupDiv");
            popupdiv.Attributes.Add("style", "opacity: 0;");
            popupdiv.Attributes.Add("class", "popupDiv");
            ajaxFileUpload = new AjaxFileUpload();
            ajaxFileUpload.MaximumNumberOfFiles = 10;
            ajaxFileUpload.AllowedFileTypes = "jpg,jpeg";
            ajaxFileUpload.Enabled = true;
            ajaxFileUpload.OnClientUploadComplete = "ajaxClientUploadComplete";
            popupdiv.Controls.Add(ajaxFileUpload);

            HtmlGenericControl btnCancel = new HtmlGenericControl("div");
            btnCancel.Attributes.Add("Id", this.ClientID + "_btnCancel");
            btnCancel.Attributes.Add("style", "width: 75px; border-color:black;border-style: solid; border-width: 1px;");
            btnCancel.Attributes.Add("float", "right");
            btnCancel.Attributes.Add("unselectable", "on");
            btnCancel.InnerText = "Cancel";
            popupdiv.Controls.Add(btnCancel);

            this.Controls.Add(popupdiv);

        }

        /// <summary>
        /// On load method decode contents of textbox before render these to client side.
        /// </summary>
        /// <param name="e">event arguments</param>
        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);

            // Register an empty OnSubmit statement so the ASP.NET WebForm_OnSubmit method will be automatically
            // created and our behavior will be able to wrap it to encode html tags prior to submission
            ScriptManager.RegisterOnSubmitStatement(this, typeof(HtmlEditorExtender), "HtmlEditorExtenderOnSubmit", "null;");

            // If this extender has default focus, use ClientState to let it know
            ClientState = (string.Compare(Page.Form.DefaultFocus, TargetControlID, StringComparison.OrdinalIgnoreCase) == 0) ? "Focused" : null;

            // decode values of textbox
            TextBox txtBox = (TextBox)TargetControl;
            if (txtBox != null)
                txtBox.Text = Decode(txtBox.Text);

            bool hasImageButton = false;
            foreach (HtmlEditorExtenderButton button in buttonList)
            {
                if (button.CommandName == "InsertImage")
                {
                    hasImageButton = true;
                }
            }

            if (!hasImageButton)
            {
                ajaxFileUpload.Visible = false;
            }
        }        

        /// <summary>
        /// When user defines/customize buttons on design time Toolbar property will accessed twice
        /// so we need to skip the first accessing of this property to avoid buttons created twice
        /// </summary>
        bool tracked = false;

        /// <summary>
        /// CreateButtons creates list of buttons for the toolbar
        /// </summary>        
        protected virtual void CreateButtons()
        {
            buttonList = new HtmlEditorExtenderButtonCollection();

            // avoid buttons for twice buttons creation
            if (!tracked)
            {
                tracked = true;
                if (this.Site != null && this.Site.DesignMode)
                {
                    return;
                }
            }
            tracked = false;
            buttonList.Add(new Undo());
            buttonList.Add(new Redo());
            buttonList.Add(new Bold());
            buttonList.Add(new Italic());
            buttonList.Add(new Underline());
            buttonList.Add(new StrikeThrough());
            buttonList.Add(new Subscript());
            buttonList.Add(new Superscript());
            buttonList.Add(new JustifyLeft());
            buttonList.Add(new JustifyCenter());
            buttonList.Add(new JustifyRight());
            buttonList.Add(new JustifyFull());
            buttonList.Add(new InsertOrderedList());
            buttonList.Add(new InsertUnorderedList());
            buttonList.Add(new CreateLink());
            buttonList.Add(new UnLink());            
            buttonList.Add(new RemoveFormat());            
            buttonList.Add(new SelectAll());
            buttonList.Add(new UnSelect());
            buttonList.Add(new Delete());
            buttonList.Add(new Cut());
            buttonList.Add(new Copy());
            buttonList.Add(new Paste());
            buttonList.Add(new BackgroundColorSelector());
            buttonList.Add(new ForeColorSelector());
            buttonList.Add(new FontNameSelector());
            buttonList.Add(new FontSizeSelector());
            buttonList.Add(new Indent());
            buttonList.Add(new Outdent());
            buttonList.Add(new InsertHorizontalRule());
            buttonList.Add(new HorizontalSeparator());
        }

        public override void RenderControl(HtmlTextWriter output)
        {
            base.RenderControl(output);
            if (this.DesignMode)
            {
                //string imageSrc = @"C:\Documents and Settings\html-editor-buttons_Designer.png";
                //string imageHtmlOutput = string.Empty;
                //byte[] imageData = new byte[25252];
                //using (Stream stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("HtmlEditorExtender.html-editor-buttons_Designer.png"))
                //{
                //    stream.Read(imageData, 0, imageData.Length);
                //}

                //using (FileStream fs = new FileStream(imageSrc, FileMode.Create))
                //using (BinaryWriter bw = new BinaryWriter(fs))
                //{
                //    bw.Write(imageData);
                //}

                //System.Web.UI.HtmlControls.HtmlImage image = new System.Web.UI.HtmlControls.HtmlImage();
                //image.Src = imageSrc;
                //using (StringWriter stringWriter = new StringWriter())
                //using (System.Web.UI.HtmlTextWriter htmlTextWriter = new System.Web.UI.HtmlTextWriter(stringWriter))
                //{
                //    image.RenderControl(htmlTextWriter);
                //    imageHtmlOutput = stringWriter.ToString();
                //}

                //output.Write("<div style='width: 423px; height: 181px;'>");
                //output.Write("<div style='background-color:#F0F0F0; display:table; padding: 2px 2px 2px 2px; border: 1px solid #c2c2c2; border-bottom: none;' >");
                //output.Write(imageHtmlOutput);
                //output.Write("</div>");
                //output.Write("<div style='border-width:1px; border-color:#c2c2c2; border-style:solid; padding: 2px 2px 2px 2px; height: 80%; overflow: auto; clear: both;' contenteditable='true'>test test</div>");
                //output.Write("</div>");
            }
        }
    }


}
