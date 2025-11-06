/**
 * @file Quantity.js
 * @description Miktar alanları için Türkçe formatlamayı (binlik ayıracı '.', ondalık ayıracı ',') ve doğrulamayı yöneten özel SimpleType.
 * Bu tip, kullanıcı girdisini anında temizler, modeli standart formatta (örn: 1234.567) tutar ve change event'lerinde doğru çalışır.
 * OData Edm.Decimal(13,3) tipine uygundur.
 * @version 5.1.0
 * @author Ali Haydar Sayar
 * @date 2025-10-03
 */
sap.ui.define([
    "sap/ui/model/SimpleType",
    "sap/ui/model/ValidateException"
], function (SimpleType, ValidateException) {
    "use strict";

    return SimpleType.extend("com.golive.federalmogul.zkatkartuk.model.types.Quantity", {
        // OData Edm.Decimal(13,3) için sınırlar
        MAX_TOTAL_DIGITS: 13,  // Toplam basamak sayısı
        MAX_DECIMAL_PLACES: 3, // Ondalık basamak sayısı

        /**
         * Model'den UI'ya formatlama yapar.
         * Standart değeri (örn: 1450.45) alır ve kullanıcı arayüzünde Türkçe formatında (örn: "1.450,450") gösterir.
         * @param {string|number} oValue Modeldan gelen değer.
         * @returns {string} Formatlanmış string.
         */
        formatValue: function (oValue) {
            if (!oValue || oValue === "0") {
                return "0,000";
            }

            // Gelen değeri string'e çevirerek işlem yapıyoruz. Bu, sondaki sıfırların kaybolmasını engeller.
            let valueStr = String(oValue);
            
            // Eğer değerde ondalık ayıracı yoksa, .000 ekle.
            if (valueStr.indexOf('.') === -1) {
                valueStr += ".000";
            }

            const parts = valueStr.split('.');
            let integerPart = parts[0];
            let decimalPart = parts[1] || "000";

            // Ondalık kısmını 3 basamağa tamamla veya kısalt.
            if (decimalPart.length < 3) {
                decimalPart = decimalPart.padEnd(3, '0');
            } else if (decimalPart.length > 3) {
                decimalPart = decimalPart.substring(0, 3);
            }

            // Tam sayı kısmına binlik ayırıcıları (nokta) ekle.
            integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

            // Sonucu Türkçe formatında (virgüllü ondalık) birleştir.
            return integerPart + "," + decimalPart;
        },

        /**
         * UI'dan Model'e ayrıştırma (parse) yapar.
         * Kullanıcının girdiği formatlı değeri (örn: "1.450,45") model için standart bir formata (örn: "1450.450") çevirir.
         * @param {string} oValue Kullanıcının input alanına girdiği değer.
         * @returns {string} Model için temizlenmiş ve standartlaştırılmış string.
         */
        parseValue: function (oValue) {
            if (!oValue) {
                return "0.000";
            }

            let value = String(oValue).trim();
            if (value === "") {
                return "0.000";
            }

            // Adım 1: Türkçe formatını standart formata çevirmek için hazırlık.
            // Önce tüm binlik ayıracı olabilecek noktaları temizle.
            value = value.replace(/\./g, '');
            // Ardından ondalık ayıracı olan virgülü noktaya çevir.
            value = value.replace(',', '.');

            // Adım 2: Geçersiz karakterleri temizle.
            // Bu adım, kullanıcının harf veya birden fazla nokta girmesi gibi durumları engeller.
            const validNumberRegex = /^[0-9]+(\.[0-9]*)?$/;
            if (!validNumberRegex.test(value)) {
                let cleanValue = "";
                let foundDecimalPoint = false;
                
                for (let i = 0; i < value.length; i++) {
                    const char = value[i];
                    
                    if (/[0-9]/.test(char)) {
                        cleanValue += char;
                    } else if (char === '.' && !foundDecimalPoint) { // Sadece ilk noktaya izin ver
                        cleanValue += '.';
                        foundDecimalPoint = true;
                    }
                }
                value = cleanValue || "0";
            }

            const parsedValue = parseFloat(value);
            if (isNaN(parsedValue)) {
                return "0.000";
            }
            
            // Adım 3: Basamak sayısı kısıtlamalarını uygula.
            const parts = value.split('.');
            const integerPart = parts[0];
            const decimalPart = parts[1] || "";
            
            const maxIntegerDigits = this.MAX_TOTAL_DIGITS - this.MAX_DECIMAL_PLACES;
            const trimmedIntegerPart = integerPart.slice(0, maxIntegerDigits);
            let trimmedDecimalPart = decimalPart.slice(0, this.MAX_DECIMAL_PLACES);
            
            // Adım 4: Model'e her zaman 3 ondalık basamakla gitmesini sağla.
            if (trimmedDecimalPart.length < 3) {
                trimmedDecimalPart = trimmedDecimalPart.padEnd(3, '0');
            }

            // Sonucu backend'in anlayacağı standart formatta birleştir ve döndür.
            return trimmedIntegerPart + "." + trimmedDecimalPart;
        },

        /**
         * Değerin OData tipine uygunluğunu doğrular.
         * Bu fonksiyon, parseValue'dan dönen standart değer üzerinde çalışır.
         * @param {string} oValue Model'e yazılacak olan standartlaştırılmış değer.
         */
        validateValue: function (oValue) {
            const strValue = String(oValue);

            // Standart formatta (noktalı ondalık) bir sayı olup olmadığını kontrol et.
            if (!/^[0-9]+(\.[0-9]{1,3})?$/.test(strValue)) {
                throw new ValidateException("Geçerli bir sayı formatı kullanın.");
            }

            if (parseFloat(strValue) < 0) {
                throw new ValidateException("Miktar sıfırdan küçük olamaz.");
            }
            
            const parts = strValue.split('.');
            const integerPart = parts[0];
            const maxIntegerDigits = this.MAX_TOTAL_DIGITS - this.MAX_DECIMAL_PLACES;

            if (integerPart.length > maxIntegerDigits) {
                throw new ValidateException(`Tam sayı kısmı en fazla ${maxIntegerDigits} basamak olabilir.`);
            }

            const decimalPart = parts[1] || "";
            if (decimalPart.length > this.MAX_DECIMAL_PLACES) {
                throw new ValidateException(`En fazla ${this.MAX_DECIMAL_PLACES} ondalık basamak girebilirsiniz.`);
            }
        }
    });
});