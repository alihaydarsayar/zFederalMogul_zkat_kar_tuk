/**
 * @file Main.controller.js
 * @description Katar Kartuş Tüketim ana controller dosyası
 * @version 1.1.0
 * @author Ali Haydar Sayar
 * @date 2025-11-06
 */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
],
    function (Controller, JSONModel, MessageBox, MessageToast, Fragment, Filter, FilterOperator) {
        "use strict";

        return Controller.extend("com.golive.federalmogul.zkatkartuk.controller.Main", {

            /**
             * Controller'ın başlangıç fonksiyonu.
             * Modelleri başlatır ve başlangıç verilerini yükler.
             * @public
             */
            onInit: function () {
                // Global models initialization
                this.oDataModel = this.getOwnerComponent().getModel();
                this.oMainModel = this.getOwnerComponent().getModel("mainModel");
                this.oMainModel.setSizeLimit(999999);
                this.getView().setModel(this.oMainModel, "mainModel");

                // View-specific model
                var oMainViewModel = new JSONModel({
                    busy: false,
                    formVisible: false,
                    passwordVisible: false,
                    login: {
                        username: "",
                        password: ""
                    },
                    formData: {
                        IvAdsoyad: "",
                        IvTarih: new Date(),
                        IvMalzeme: "",
                        IvMiktar: null,
                        IvBant: ""
                    },
                    // Model tabanlı validasyon için
                    validation: {
                        tarihState: "None",
                        tarihStateText: "",
                        malzemeState: "None",
                        malzemeStateText: "",
                        miktarState: "None",
                        miktarStateText: "",
                        bantState: "None",
                        bantStateText: ""
                    }
                });
                this.getView().setModel(oMainViewModel, "mainView");

                this._loadInitialData();
            },

            /**
             * Kullanıcı listesini (GetUserNameSet) ve Bant listesini (GetBantSet) OData servisinden çeker.
             * @private
             */
            _loadInitialData: function () {
                var oMainModel = this.oMainModel;
                var oMainView = this.getView().getModel("mainView");

                oMainView.setProperty("/busy", true);

                // 1. Kullanıcıları Yükle
                this.oDataModel.read("/GetUserNameSet", {
                    success: (oData) => {
                        oMainModel.setProperty("/users", oData.results);
                    },
                    error: (oError) => {
                        // MessageBox.error("Hata alındı");
                        sap.ui.core.BusyIndicator.hide(0);
                        oMainView.setProperty("/busy", false);
                        var msg = oError.message;
                        var parsedResponse = null;
                        try {
                            parsedResponse = JSON.parse(oError.responseText);
                        } catch (e) {

                        }
                        if ((oError.statusCode === "400" || oError.statusCode === 400) && parsedResponse) {
                            msg = parsedResponse.error.message.value;
                        }
                        MessageBox.error(
                            msg, {
                            icon: MessageBox.Icon.ERROR,
                            title: oError.statusCode + ":" + oError.statusText,
                            actions: [MessageBox.Action.OK],
                            emphasizedAction: MessageBox.Action.YES,
                            onClose: function (oAction) { }
                        });
                    }
                });

                // 2. Bantları Yükle
                this.oDataModel.read("/GetBantSet", {
                    success: (oData) => {
                        oMainModel.setProperty("/bands", oData.results);
                    },
                    error: (oError) => {
                        // MessageBox.error("Hata alındı");
                        sap.ui.core.BusyIndicator.hide(0);
                        oMainView.setProperty("/busy", false);
                        var msg = oError.message;
                        var parsedResponse = null;
                        try {
                            parsedResponse = JSON.parse(oError.responseText);
                        } catch (e) {

                        }
                        if ((oError.statusCode === "400" || oError.statusCode === 400) && parsedResponse) {
                            msg = parsedResponse.error.message.value;
                        }
                        MessageBox.error(
                            msg, {
                            icon: MessageBox.Icon.ERROR,
                            title: oError.statusCode + ":" + oError.statusText,
                            actions: [MessageBox.Action.OK],
                            emphasizedAction: MessageBox.Action.YES,
                            onClose: function (oAction) { }
                        });
                    },
                    complete: () => {
                        oMainView.setProperty("/busy", false);
                    }
                });
            },

            /**
             * Kullanıcı seçimi değiştiğinde şifre alanını gösterir.
             * @param {sap.ui.base.Event} oEvent
             */
            onUserChange: function (oEvent) {
                var oMainView = this.getView().getModel("mainView");
                var oSelectedItem = oEvent.getParameter("selectedItem");

                if (oSelectedItem) {
                    oMainView.setProperty("/passwordVisible", true);
                    oMainView.setProperty("/login/username", oSelectedItem.getKey());
                } else {
                    oMainView.setProperty("/passwordVisible", false);
                    oMainView.setProperty("/login/username", "");
                }
            },

            /**
             * "Giriş Yap" butonu olayı.
             * UserCheckSet servisini çağırır ve girişi doğrular.
             * @public
             */
            onLogin: function () {
                var oMainView = this.getView().getModel("mainView");
                var oLoginData = oMainView.getProperty("/login");

                if (!oLoginData.username || !oLoginData.password) {
                    MessageBox.warning("Lütfen kullanıcı adı ve şifre giriniz.");
                    return;
                }

                oMainView.setProperty("/busy", true);

                var oPayload = {
                    IvAdsoyad: oLoginData.username,
                    IvSifre: oLoginData.password
                };

                this.oDataModel.create("/UserCheckSet", oPayload, {
                    success: (oData) => {
                        oMainView.setProperty("/busy", false);
                        if (oData.EvType === 'S') {
                            MessageToast.show(oData.EvMesaj || "Giriş başarılı.");
                            oMainView.setProperty("/formVisible", true);
                            oMainView.setProperty("/formData/IvAdsoyad", oLoginData.username);
                            oMainView.setProperty("/login/password", "");
                        } else {
                            MessageBox.error(oData.EvMesaj || "Giriş başarısız.");
                        }
                    },
                    error: (oError) => {
                        oMainView.setProperty("/busy", false);
                        MessageBox.error("Giriş sırasında sunucu hatası oluştu.");
                    }
                });
            },

            // --- Malzeme Arama Fonksiyonları ---

            onMaterialValueHelp: function () {
                var oView = this.getView();

                if (!this._pValueHelpDialog) {
                    this._pValueHelpDialog = Fragment.load({
                        id: oView.getId(),
                        name: "com.golive.federalmogul.zkatkartuk.fragment.MaterialSelectDialog",
                        controller: this
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        // Dialog için OData modelini ayarla (arama yapabilmek için)
                        oDialog.setModel(this.oDataModel);
                        return oDialog;
                    }.bind(this));
                }

                this._pValueHelpDialog.then(function (oDialog) {
                    // Değer yardımı açılmadan önce GetMalzemeSet'i çağır
                    var oBinding = oDialog.getBinding("items");
                    if (oBinding) {
                        oBinding.filter([]); // mevcut filtreleri temizle
                    }
                    oDialog.open();
                }.bind(this));
            },

            _onMaterialValueHelpSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                // Backend yıldızlı aramayı destekliyorsa (IvMatnr eq '14197*')
                // Operatör Contains değil, StartsWith veya EQ olmalı.
                // Örneğinizde $filter=IvMatnr eq '14197*' olduğu için wild card'ı değere ekliyoruz.
                var oFilter = new Filter("IvMatnr", FilterOperator.Contains, sValue);
                var oBinding = oEvent.getSource().getBinding("items");
                oBinding.filter([oFilter]);
            },

            _onMaterialValueHelpClose: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                oEvent.getSource().getBinding("items").filter([]);

                if (oSelectedItem) {
                    var sMaterialNumber = oSelectedItem.getTitle();
                    this.getView().getModel("mainView").setProperty("/formData/IvMalzeme", sMaterialNumber);
                    this._clearValidationState(null, "malzemeState"); // Seçim sonrası validasyon
                }
            },

            onMaterialSuggest: function (oEvent) {
                var sValue = oEvent.getParameter("suggestValue");

                if (sValue.length < 3) {
                    return;
                }

                // Yıldızlı arama için '*' ekliyoruz
                var sFilterValue = sValue + '*';
                var oFilter = new Filter("IvMatnr", FilterOperator.EQ, sFilterValue);

                this.oDataModel.read("/GetMalzemeSet", {
                    filters: [oFilter],
                    success: (oData) => {
                        this.oMainModel.setProperty("/materials", oData.results);
                    },
                    error: (oError) => {
                        console.error("Malzeme öneri servisi hatası", oError);
                    }
                });
            },

            onMaterialSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oMainView = this.getView().getModel("mainView");
                oMainView.setProperty("/busy", true);

                var oFilter = new Filter("IvMatnr", FilterOperator.EQ, sValue);

                this.oDataModel.read("/GetMalzemeSet", {
                    filters: [oFilter],
                    success: (oData) => {
                        oMainView.setProperty("/busy", false);
                        if (oData.results && oData.results.length > 0) {
                            oMainView.setProperty("/formData/IvMalzeme", oData.results[0].Matnr);
                        } else {
                            MessageToast.show(this.getView().getModel("i18n").getResourceBundle().getText("materialNotFound"));
                        }
                        this._clearValidationState(null, "malzemeState");
                    },
                    error: (oError) => {
                        oMainView.setProperty("/busy", false);
                        MessageBox.error("Malzeme aranırken hata oluştu.");
                    }
                });
            },

            // --- Bant Seçimi ---

            onBantSelectionChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("listItem");
                if (oSelectedItem) {
                    var sBantKey = oSelectedItem.getBindingContext("mainModel").getProperty("Bant");
                    this.getView().getModel("mainView").setProperty("/formData/IvBant", sBantKey);
                    this._clearValidationState(null, "bantState");
                }
            },

            // --- Kaydetme, Temizleme ve Validasyon ---

            /**
             * "Kaydet" butonu olayı.
             * Formu doğrular ve CreateMalzemeBelgeSet servisini çağırır.
             * @public
             */
            onSave: function () {
                if (!this._validateForm()) {
                    return;
                }

                var oMainView = this.getView().getModel("mainView");
                var oI18n = this.getView().getModel("i18n").getResourceBundle();
                var oFormData = oMainView.getProperty("/formData");

                // Tarih objesini OData'nın beklediği formata çevir (yyyy-MM-ddT00:00:00)
                var oDate = oFormData.IvTarih;
                var sISODate = oDate.toISOString().split('T')[0] + "T00:00:00";

                var oPayload = {
                    IvAdsoyad: oFormData.IvAdsoyad,
                    IvBant: oFormData.IvBant,
                    IvMalzeme: oFormData.IvMalzeme,
                    IvMiktar: oFormData.IvMiktar.toString(),
                    IvTarih: sISODate
                };

                oMainView.setProperty("/busy", true);

                this.oDataModel.create("/CreateMalzemeBelgeSet", oPayload, {
                    success: (oData) => {
                        oMainView.setProperty("/busy", false);
                        if (oData.EvType === 'S' || !oData.EvType) { // Başarı S veya boş dönebilir
                            MessageToast.show(oData.EvMesaj || oI18n.getText("saveSuccess"));
                            this.onClear();
                        } else {
                            MessageBox.error(oData.EvMesaj || oI18n.getText("saveError"));
                        }
                    },
                    error: (oError) => {
                        oMainView.setProperty("/busy", false);
                        try {
                            var oErrorResponse = JSON.parse(oError.responseText);
                            MessageBox.error(oErrorResponse.error.message.value || "Bilinmeyen sunucu hatası.");
                        } catch (e) {
                            MessageBox.error(oI18n.getText("saveErrorGeneral"));
                        }
                    }
                });
            },

            /**
             * "Temizle" butonu olayı.
             * Form verilerini sıfırlar (kullanıcı adı hariç).
             * @public
             */
            onClear: function () {
                var oMainView = this.getView().getModel("mainView");
                var sAdSoyad = oMainView.getProperty("/formData/IvAdsoyad"); // Kullanıcı adını koru

                // Form verilerini sıfırla
                oMainView.setProperty("/formData", {
                    IvAdsoyad: sAdSoyad,
                    IvTarih: new Date(),
                    IvMalzeme: "",
                    IvMiktar: null,
                    IvBant: ""
                });

                // Validasyon durumlarını sıfırla
                this._resetValidationStates();

                // Bant Listesi seçimini kaldır
                this.byId("bandList").removeSelections(true);
            },

            /**
             * Formu kaydetmek için doğrular.
             * Model tabanlı çalışır, `byId` kullanmaz.
             * Tüm hataları toplu olarak gösterir.
             * @returns {boolean} Form geçerli mi?
             * @private
             */
            _validateForm: function () {
                var oMainView = this.getView().getModel("mainView");
                var oData = oMainView.getProperty("/formData");
                var oI18n = this.getView().getModel("i18n").getResourceBundle();

                var aErrorMessages = [];
                var oValidationState = { // Önce temizle
                    tarihState: "None", tarihStateText: "",
                    malzemeState: "None", malzemeStateText: "",
                    miktarState: "None", miktarStateText: "",
                    bantState: "None", bantStateText: ""
                };

                // 1. Tarih
                if (!oData.IvTarih) {
                    var sError = oI18n.getText("validationTarih");
                    aErrorMessages.push(sError);
                    oValidationState.tarihState = "Error";
                    oValidationState.tarihStateText = sError;
                }

                // 2. Malzeme (Min 7 karakter)
                if (!oData.IvMalzeme || oData.IvMalzeme.length < 7) {
                    var sError = oI18n.getText("validationMalzeme");
                    aErrorMessages.push(sError);
                    oValidationState.malzemeState = "Error";
                    oValidationState.malzemeStateText = sError;
                }

                // 3. Adet
                if (!oData.IvMiktar || oData.IvMiktar <= 0) {
                    var sError = oI18n.getText("validationMiktar");
                    aErrorMessages.push(sError);
                    oValidationState.miktarState = "Error";
                    oValidationState.miktarStateText = sError;
                }

                // 4. Bant
                if (!oData.IvBant) {
                    var sError = oI18n.getText("validationBant");
                    aErrorMessages.push(sError);
                    oValidationState.bantState = "Error";
                    oValidationState.bantStateText = sError;
                }

                oMainView.setProperty("/validation", oValidationState);

                if (aErrorMessages.length > 0) {
                    MessageBox.warning(oI18n.getText("formValidationWarning") + "\n\n" + aErrorMessages.join("\n"));
                    return false;
                }

                return true;
            },

            /**
             * Kullanıcı input girdikçe hata durumunu temizler.
             * @param {sap.ui.base.Event} [oEvent] Event objesi (XML'den geliyorsa)
             * @param {string} [sField] Alan adı (manuel tetikleniyorsa)
             * @private
             */
            _clearValidationState: function (oEvent, sField) {
                var sFieldName;

                if (oEvent) {
                    // XML'den 'change' ile tetiklendi
                    var oSource = oEvent.getSource();
                    var sId = oSource.getId();

                    if (sId.includes("datePicker")) sFieldName = "tarihState";
                    else if (sId.includes("materialInput")) sFieldName = "malzemeState";
                    else if (sId.includes("quantityInput")) sFieldName = "miktarState";
                } else if (sField) {
                    // Manuel tetiklendi (örn: bant seçimi, malzeme yardımı)
                    sFieldName = sField;
                }

                if (sFieldName) {
                    var oMainView = this.getView().getModel("mainView");
                    oMainView.setProperty("/validation/" + sFieldName, "None");
                    oMainView.setProperty("/validation/" + sFieldName + "Text", "");

                    // Bant listesi için ayrı stateText'i temizle
                    if (sFieldName === "bantState") {
                        oMainView.setProperty("/validation/bantStateText", "");
                    }
                }
            },

            /**
             * Tüm validasyon durumlarını temizler (Clear butonu için)
             * @private
             */
            _resetValidationStates: function () {
                this.getView().getModel("mainView").setProperty("/validation", {
                    tarihState: "None", tarihStateText: "",
                    malzemeState: "None", malzemeStateText: "",
                    miktarState: "None", miktarStateText: "",
                    bantState: "None", bantStateText: ""
                });
            }
        });
    });