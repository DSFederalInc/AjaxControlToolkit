﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using System.Xml.Linq;

namespace AjaxControlToolkit.Reference.Core.Parsing {

    public class DocParser {
        const string SummaryTagName = "summary";
        const string RemarksTagName = "remarks";
        const string GetterTagName = "getter";
        const string SetterTagName = "setter";
        const string ParamTagName = "param";

        static Lazy<DocParser> _instance = new Lazy<DocParser>(() => new DocParser());
        public static DocParser Instance {
            get { return _instance.Value; }
        }

        DocParser() { }

        public void FillInfo(TypeDoc info, IEnumerable<XElement> values) {
            GetSummaryAndRemarks(info, values);
        }

        public void FillInfo(MethodDoc info, IEnumerable<XElement> values) {
            GetSummaryAndRemarks(info, values);

            var parameters = values.Where(el => el.Name == ParamTagName);

            foreach(var param in parameters) {
                var name = param.Attribute("name").Value;
                var description = CleanSpaces(param.Value);
                info.AddParam(name, null, description);
            }
        }

        public void FillInfo(ClientMethodDoc info, IEnumerable<XElement> values) {
            GetSummaryAndRemarks(info, values);
            var parameters = values.Where(el => el.Name == ParamTagName);

            foreach(var param in parameters) {
                var name = param.Attribute("name").Value;
                var typeName = param.Attribute("type").Value;
                var description = CleanSpaces(param.Value);
                info.AddParam(name, typeName, description);
            }
        }

        public void FillInfo(PropertyDoc info, IEnumerable<XElement> values) {
            GetSummaryAndRemarks(info, values);
        }

        public void FillInfo(EventDoc info, IEnumerable<XElement> values) {
            GetSummaryAndRemarks(info, values);
        }

        public void FillInfo(ClientPropertyDoc info, IEnumerable<XElement> values) {
            GetSummaryAndRemarks(info, values);
            info.GetterName = GetValue(values, GetterTagName);
            info.SetterName = GetValue(values, SetterTagName);
        }

        void GetSummaryAndRemarks(DocBase info, IEnumerable<XElement> values) {
            if(values.Any()) {
                info.Summary = GetValue(values, SummaryTagName);
                info.Remarks = GetValue(values, RemarksTagName);
            } else
                info.Summary = "<INVALID DOC MARKUP>";
        }

        string GetValue(IEnumerable<XElement> values, string elementName) {
            var element = values.FirstOrDefault(el => el.Name == elementName);

            if(element == null)
                return null;

            return CleanSpaces(element.Value);
        }

        string CleanSpaces(string value) {
            return Regex.Replace(value, @"\s+", " ");
        }

    }

}