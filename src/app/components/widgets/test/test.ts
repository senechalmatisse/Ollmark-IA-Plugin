import {Component, inject, OnInit} from '@angular/core';
import {TestService} from '../../../services/test-service/test-service';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [],
  templateUrl: './test.html',
  styleUrl: './test.scss',
})
export class Test implements OnInit {
  private testService = inject(TestService);

  message = "";

  ngOnInit(): void {
    this.testService.getMessageTest().subscribe((message) => {
      this.message = message;
    });
  }

}
