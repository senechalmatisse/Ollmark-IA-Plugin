import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {Carousel, CarouselItem} from './carousel';

const mockItems: CarouselItem[] = [
  {id: '1', imageUrl: 'https://picsum.photos/seed/1/56/56'},
  {id: '2', imageUrl: 'https://picsum.photos/seed/2/56/56'},
  {id: '3', imageUrl: 'https://picsum.photos/seed/3/56/56'},
  {id: '4', imageUrl: 'https://picsum.photos/seed/4/56/56'},
  {id: '5', imageUrl: 'https://picsum.photos/seed/5/56/56'},
  {id: '6', imageUrl: 'https://picsum.photos/seed/6/56/56'},
];

describe('Carousel', () => {
  let component: Carousel;
  let fixture: ComponentFixture<Carousel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Carousel],
    }).compileComponents();

    fixture = TestBed.createComponent(Carousel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('items', mockItems);
    fixture.componentRef.setInput('visibleCount', 4);
    fixture.detectChanges(); 
  });


  it('should create the component', () => {
    expect(component).toBeTruthy();
  });


  it('should start with currentIndex at 0', () => {
    expect(component.currentIndex).toBe(0);
  });

  it('should start with selectedIndex at 0', () => {
    expect(component.selectedIndex).toBe(0);
  });

  it('should compute maxIndex correctly', () => {
    expect(component.maxIndex).toBe(2);
  });


  it('should increment currentIndex on onNext()', () => {
    component.onNext();
    expect(component.currentIndex).toBe(1);
  });

  it('should not exceed maxIndex on onNext()', () => {
    component.currentIndex = component.maxIndex;
    component.onNext();
    expect(component.currentIndex).toBe(component.maxIndex);
  });

  it('should emit slideChanged with new index on onNext()', () => {
    spyOn(component.slideChanged, 'emit');
    component.onNext();
    expect(component.slideChanged.emit).toHaveBeenCalledWith(1);
  });


  it('should decrement currentIndex on onPrev()', () => {
    component.currentIndex = 1;
    component.onPrev();
    expect(component.currentIndex).toBe(0);
  });

  it('should not go below 0 on onPrev()', () => {
    component.currentIndex = 0;
    component.onPrev();
    expect(component.currentIndex).toBe(0);
  });

  it('should emit slideChanged with new index on onPrev()', () => {
    component.currentIndex = 1;
    spyOn(component.slideChanged, 'emit');
    component.onPrev();
    expect(component.slideChanged.emit).toHaveBeenCalledWith(0);
  });


  it('should update selectedIndex on onSelectItem()', () => {
    component.onSelectItem(2);
    expect(component.selectedIndex).toBe(2);
  });

  it('should emit itemSelected with the correct item on onSelectItem()', () => {
    spyOn(component.itemSelected, 'emit');
    component.onSelectItem(1);
    expect(component.itemSelected.emit).toHaveBeenCalledWith(mockItems[1]);
  });


  it('should render the correct number of carousel items', () => {
    const items = fixture.debugElement.queryAll(By.css('.carousel-item'));
    expect(items.length).toBe(mockItems.length);
  });

  it('should apply active class on selected item', () => {
    component.onSelectItem(2);
    fixture.detectChanges();
    const items = fixture.debugElement.queryAll(By.css('.carousel-item'));
    expect(items[2].nativeElement.classList).toContain('active');
  });

  it('should disable prev button when currentIndex is 0', () => {
    const prevBtn = fixture.debugElement.query(By.css('.carousel-btn:first-child'));
    expect(prevBtn.nativeElement.disabled).toBeTrue();
  });

  it('should disable next button when at maxIndex', () => {
    component.currentIndex = component.maxIndex;
    fixture.detectChanges();
    const nextBtn = fixture.debugElement.query(By.css('.carousel-btn:last-child'));
    expect(nextBtn.nativeElement.disabled).toBeTrue();
  });

  it('should render images with correct src', () => {
    const images = fixture.debugElement.queryAll(By.css('.item-image'));
    expect(images[0].nativeElement.getAttribute('src')).toBe(mockItems[0].imageUrl);
    expect(images[1].nativeElement.getAttribute('src')).toBe(mockItems[1].imageUrl);
  });
});