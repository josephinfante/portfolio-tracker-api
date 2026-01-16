export interface AssetPriceEntity {
	id: string;
	assetId: string;

	quoteCurrency: string;
	price: string;
	source: string;

	priceAt: number;
	createdAt: number;
}
