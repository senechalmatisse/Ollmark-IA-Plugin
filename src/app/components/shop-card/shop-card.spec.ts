import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopCard } from './shop-card';
import { Shop } from '../../models/shop.model';

describe('ShopCard', () => {
  let component: ShopCard;
  let fixture: ComponentFixture<ShopCard>;

  const mockShop: Shop = {
    id: '1',
    name: 'Ma Boutique',
    imageUrl: 'https://example.com/shop.jpg',
  };

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

  it('should display shop name', () => {
    const nameElement = fixture.nativeElement.querySelector('.shop-name');
    expect(nameElement.textContent).toContain('Ma Boutique');
  });

  it('should display shop image', () => {
    const imgElement = fixture.nativeElement.querySelector('.shop-image img');
    expect(imgElement.src).toBe('https://example.com/shop.jpg');
    expect(imgElement.alt).toBe('Ma Boutique');
  });

  it('should have loading set to false by default', () => {
    expect(component.loading).toBeFalse();
  });

  it('should display spinner when loading is true', () => {
    component.loading = true;
    fixture.detectChanges();

    const spinnerOverlay = fixture.nativeElement.querySelector('.spinner-overlay');
    expect(spinnerOverlay).toBeTruthy();
  });

  it('should not display spinner when loading is false', () => {
    component.loading = false;
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

  it('should update displayed name when shop input changes', () => {
    const newShop: Shop = {
      id: '2',
      name: 'Nouvelle Boutique',
      imageUrl: 'https://example.com/new-shop.jpg',
    };
    component.shop = newShop;
    fixture.detectChanges();

    const nameElement = fixture.nativeElement.querySelector('.shop-name');
    expect(nameElement.textContent).toContain('Nouvelle Boutique');
  });

  it('should update image when shop input changes', () => {
    const newShop: Shop = {
      id: '2',
      name: 'Nouvelle Boutique',
      imageUrl: 'https://example.com/new-shop.jpg',
    };
    component.shop = newShop;
    fixture.detectChanges();

    const imgElement = fixture.nativeElement.querySelector('.shop-image img');
    expect(imgElement.src).toBe('https://example.com/new-shop.jpg');
    expect(imgElement.alt).toBe('Nouvelle Boutique');
  });

  it('should handle shop with empty name', () => {
    const emptyNameShop: Shop = {
      id: '3',
      name: '',
      imageUrl: 'https://example.com/shop.jpg',
    };
    component.shop = emptyNameShop;
    fixture.detectChanges();

    const nameElement = fixture.nativeElement.querySelector('.shop-name');
    expect(nameElement.textContent.trim()).toBe('');
  });

  it('should toggle loading state correctly', () => {
    expect(component.loading).toBeFalse();

    component.loading = true;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner-overlay')).toBeTruthy();

    component.loading = false;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner-overlay')).toBeFalsy();
  });

  it('should contain spinner element inside spinner-overlay when loading', () => {
    component.loading = true;
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
    const newShop: Shop = {
      id: '5',
      name: 'Boutique Mise à Jour',
      imageUrl: 'https://example.com/updated.jpg',
    };
    component.shop = newShop;
    fixture.detectChanges();

    spyOn(component.generate, 'emit');
    const generateButton = fixture.nativeElement.querySelectorAll('.action-btn')[0];
    generateButton.click();

    expect(component.generate.emit).toHaveBeenCalledWith(newShop);
  });

  it('should emit add event with updated shop after input change', () => {
    const newShop: Shop = {
      id: '6',
      name: 'Autre Boutique',
      imageUrl: 'https://example.com/autre.jpg',
    };
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
});
