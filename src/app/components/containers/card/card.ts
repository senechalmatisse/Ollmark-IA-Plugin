import { Component } from '@angular/core';
import {CustomCheckbox} from '../../inputs/custom-checkbox/custom-checkbox';
import {SHOP_ATTRIBUTE_LABELS} from '../../../models/shop-attribute.model';

@Component({
  selector: 'app-card',
  imports: [
    CustomCheckbox
  ],
  templateUrl: './card.html',
  styleUrl: './card.scss',
})
export class Card {

  protected readonly attributeLabels = SHOP_ATTRIBUTE_LABELS;
}
