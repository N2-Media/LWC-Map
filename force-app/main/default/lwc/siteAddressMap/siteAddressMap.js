import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';

export default class SiteAddressMap extends LightningElement {
    // Injected automatically on record pages
    @api recordId;
    @api objectApiName;

    // Configurable via App Builder
    @api streetField = 'Street__c';
    @api cityField = 'City__c';
    @api stateField = 'State__c';
    @api postalCodeField = 'Postal_Code__c';
    @api mapTitle;
    @api zoomLevel;
    @api mapHeight;

    @wire(getRecord, { recordId: '$recordId', fields: '$fieldsList' })
    record;

    /**
     * Build the fields array dynamically from the design attributes.
     * Returns null until all required config is present, which
     * prevents the wire from firing prematurely.
     */
    get fieldsList() {
        if (!this.objectApiName || !this.streetField) {
            return undefined;
        }

        const fields = [this.qualifiedField(this.streetField)];

        if (this.cityField) {
            fields.push(this.qualifiedField(this.cityField));
        }
        if (this.stateField) {
            fields.push(this.qualifiedField(this.stateField));
        }
        if (this.postalCodeField) {
            fields.push(this.qualifiedField(this.postalCodeField));
        }

        return fields;
    }

    /**
     * Prepend the object API name if the admin didn't include it.
     * Accepts both "Site_Street__c" and "Account.Site_Street__c".
     */
    qualifiedField(fieldName) {
        if (!fieldName) return null;
        return fieldName.includes('.')
            ? fieldName
            : `${this.objectApiName}.${fieldName}`;
    }

    /**
     * Pull a field value out of the wire result using the
     * fully qualified field name.
     */
    getFieldVal(fieldName) {
        if (!this.record?.data || !fieldName) return '';
        const qualified = this.qualifiedField(fieldName);
        const parts = qualified.split('.');
        const fld = parts[parts.length - 1];
        return this.record.data.fields[fld]?.value || '';
    }

    get street()     { return this.getFieldVal(this.streetField); }
    get city()       { return this.getFieldVal(this.cityField); }
    get state()      { return this.getFieldVal(this.stateField); }
    get postalCode() { return this.getFieldVal(this.postalCodeField); }

    get markerTitle() {
        return this.mapTitle || 'Site Address';
    }

    get zoom() {
        return this.zoomLevel ? parseInt(this.zoomLevel, 10) : 15;
    }

    renderedCallback() {
        const container = this.refs.mapContainer;
        if (container) {
            const h = this.mapHeight || '400';
            container.style.setProperty('--map-height', `${h}px`);
        }
    }

    get mapMarkers() {
        if (!this.hasAddress) return [];
        return [
            {
                location: {
                    Street: this.street,
                    City: this.city,
                    State: this.state,
                    PostalCode: this.postalCode
                },
                title: this.markerTitle
            }
        ];
    }

    get hasAddress() {
        return !!(this.record?.data && this.street);
    }

    get isLoading() {
        return !this.record?.data && !this.record?.error;
    }

    get noAddress() {
        return !this.isLoading && !this.hasError && !this.hasAddress;
    }

    get hasError() {
        return !!this.record?.error;
    }

    get errorMessage() {
        if (!this.record?.error) return '';
        const err = this.record.error;
        if (err.body?.message) return err.body.message;
        if (err.message) return err.message;
        return 'Unable to load address fields. Check your field API name configuration.';
    }
}
