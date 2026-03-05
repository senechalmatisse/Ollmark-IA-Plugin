import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopCard } from './shop-card';
import { Shop, ShopAddress } from '../../models/shop.model';

function createMockShop(overrides: Partial<Shop> = {}): Shop {
  const defaultAddress: ShopAddress = {
    street: '123 Rue du Commerce',
    city: 'Paris',
    zipCode: '75001',
    country: 'France',
    complement: null,
    phone: null,
    formatted: '123 Rue du Commerce, 75001 Paris'
  };

  return {
    id: '1',
    label: 'Ma Boutique',
    address: defaultAddress,
    humanUrl: 'ollca.com/paris/boutiques/ma-boutique',
    technicalUrl: null,
    eligibilityUrl: null,
    logo: { id: 'logo1', url: 'https://example.com/logo.jpg' },
    photos: [],
    primaryCategory: { id: 'cat1', label: 'Boulangerie' },
    geolocation: { latitude: 48.8566, longitude: 2.3522 },
    ...overrides
  };
}

describe('ShopCard', () => {
  let component: ShopCard;
  let fixture: ComponentFixture<ShopCard>;

  const mockShop: Shop = createMockShop();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopCard],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopCard);
    component = fixture.componentInstance;
    component.shop = mockShop;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display shop label', () => {
    const nameElement = fixture.nativeElement.querySelector('.shop-name');
    expect(nameElement.textContent).toContain('Ma Boutique');
  });

  it('should display shop logo as image', () => {
    const imgElement = fixture.nativeElement.querySelector('.shop-image img');
    expect(imgElement.src).toBe('https://example.com/logo.jpg');
    expect(imgElement.alt).toBe('Ma Boutique');
  });

  it('should use first photo if no logo', () => {
    const shopWithPhoto = createMockShop({
      logo: null,
      photos: [{ id: 'photo1', url: 'https://example.com/photo.jpg' }]
    });
    component.shop = shopWithPhoto;
    fixture.detectChanges();

    expect(component.imageUrl).toBe('https://example.com/photo.jpg');
  });

  it('should use placeholder if no logo and no photos', () => {
    const shopNoImages = createMockShop({ logo: null, photos: [] });
    component.shop = shopNoImages;
    fixture.detectChanges();

    expect(component.imageUrl).toContain('data:image/svg+xml');
    expect(component.imageUrl).toContain('Image%20non%20disponible');
  });

  it('should have loading set to false by default', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should display spinner when loading is true', () => {
    fixture.componentRef.setInput("loading", true)
    fixture.detectChanges();

    const spinnerOverlay = fixture.nativeElement.querySelector('.spinner-overlay');
    expect(spinnerOverlay).toBeTruthy();
  });

  it('should not display spinner when loading is false', () => {
    fixture.componentRef.setInput("loading", false)
    fixture.detectChanges();

    const spinnerOverlay = fixture.nativeElement.querySelector('.spinner-overlay');
    expect(spinnerOverlay).toBeFalsy();
  });

  it('should have shop-card class on root element', () => {
    const cardElement = fixture.nativeElement.querySelector('.shop-card');
    expect(cardElement).toBeTruthy();
  });

  it('should render shop-info section', () => {
    const infoElement = fixture.nativeElement.querySelector('.shop-info');
    expect(infoElement).toBeTruthy();
  });

  it('should update displayed label when shop input changes', () => {
    const newShop = createMockShop({ id: '2', label: 'Nouvelle Boutique' });
    fixture.componentRef.setInput('shop', newShop);
    fixture.detectChanges();

    const nameElement = fixture.nativeElement.querySelector('.shop-name');
    expect(nameElement.textContent).toContain('Nouvelle Boutique');
  });

  it('should update image when shop input changes', () => {
    const newShop = createMockShop({
      id: '2',
      label: 'Nouvelle Boutique',
      logo: { id: 'logo2', url: 'https://example.com/new-logo.jpg' }
    });
    fixture.componentRef.setInput('shop', newShop);
    fixture.detectChanges();

    const imgElement = fixture.nativeElement.querySelector('.shop-image img');
    expect(imgElement.src).toBe('https://example.com/new-logo.jpg');
    expect(imgElement.alt).toBe('Nouvelle Boutique');
  });

  it('should handle shop with empty label', () => {
    const emptyLabelShop = createMockShop({ id: '3', label: '' });
    fixture.componentRef.setInput('shop', emptyLabelShop);
    fixture.detectChanges();

    const nameElement = fixture.nativeElement.querySelector('.shop-name');
    expect(nameElement.textContent.trim()).toBe('');
  });

  it('should toggle loading state correctly', () => {
    expect(component.loading()).toBeFalse();

    fixture.componentRef.setInput("loading", true)
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner-overlay')).toBeTruthy();

    fixture.componentRef.setInput("loading", false)
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner-overlay')).toBeFalsy();
  });

  it('should contain spinner element inside spinner-overlay when loading', () => {
    fixture.componentRef.setInput("loading", true)
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.spinner-overlay .spinner');
    expect(spinner).toBeTruthy();
  });

  it('should render image inside shop-image container', () => {
    const imgContainer = fixture.nativeElement.querySelector('.shop-image');
    const img = imgContainer.querySelector('img');
    expect(img).toBeTruthy();
  });

  it('should render shop-actions container with two buttons', () => {
    const actionsContainer = fixture.nativeElement.querySelector('.shop-actions');
    expect(actionsContainer).toBeTruthy();

    const buttons = actionsContainer.querySelectorAll('.action-btn');
    expect(buttons.length).toBe(2);
  });

  it('should render generate button with correct title', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.action-btn');
    const generateButton = buttons[0];
    expect(generateButton.getAttribute('title')).toBe('Générer dans Penpot');
  });

  it('should render add button with correct title', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.action-btn');
    const addButton = buttons[1];
    expect(addButton.getAttribute('title')).toBe('Ajouter à la sélection');
  });

  it('should emit generate event when generate button is clicked', () => {
    spyOn(component.generate, 'emit');

    const generateButton = fixture.nativeElement.querySelectorAll('.action-btn')[0];
    generateButton.click();

    expect(component.generate.emit).toHaveBeenCalledWith(mockShop);
  });

  it('should emit add event when add button is clicked', () => {
    spyOn(component.add, 'emit');

    const addButton = fixture.nativeElement.querySelectorAll('.action-btn')[1];
    addButton.click();

    expect(component.add.emit).toHaveBeenCalledWith(mockShop);
  });

  it('should stop propagation when generate button is clicked', () => {
    const generateButton = fixture.nativeElement.querySelectorAll('.action-btn')[0];
    const clickEvent = new MouseEvent('click', { bubbles: true });
    spyOn(clickEvent, 'stopPropagation');

    generateButton.dispatchEvent(clickEvent);

    expect(clickEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should stop propagation when add button is clicked', () => {
    const addButton = fixture.nativeElement.querySelectorAll('.action-btn')[1];
    const clickEvent = new MouseEvent('click', { bubbles: true });
    spyOn(clickEvent, 'stopPropagation');

    addButton.dispatchEvent(clickEvent);

    expect(clickEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should emit generate event with updated shop after input change', () => {
    const newShop = createMockShop({ id: '5', label: 'Boutique Mise à Jour' });
    component.shop = newShop;
    fixture.detectChanges();

    spyOn(component.generate, 'emit');
    const generateButton = fixture.nativeElement.querySelectorAll('.action-btn')[0];
    generateButton.click();

    expect(component.generate.emit).toHaveBeenCalledWith(newShop);
  });

  it('should emit add event with updated shop after input change', () => {
    const newShop = createMockShop({ id: '6', label: 'Autre Boutique' });
    component.shop = newShop;
    fixture.detectChanges();

    spyOn(component.add, 'emit');
    const addButton = fixture.nativeElement.querySelectorAll('.action-btn')[1];
    addButton.click();

    expect(component.add.emit).toHaveBeenCalledWith(newShop);
  });

  it('should render SVG icons inside action buttons', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.action-btn');

    buttons.forEach((button: HTMLElement) => {
      const svg = button.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  // Image optimization tests
  describe('Image Optimization', () => {
    it('should have lazy loading attribute on image', () => {
      const imgElement = fixture.nativeElement.querySelector('.shop-image img');
      expect(imgElement.getAttribute('loading')).toBe('lazy');
    });

    it('should have async decoding attribute on image', () => {
      const imgElement = fixture.nativeElement.querySelector('.shop-image img');
      expect(imgElement.getAttribute('decoding')).toBe('async');
    });

    it('should have low fetchpriority attribute on image', () => {
      const imgElement = fixture.nativeElement.querySelector('.shop-image img');
      expect(imgElement.getAttribute('fetchpriority')).toBe('low');
    });
  });
});
