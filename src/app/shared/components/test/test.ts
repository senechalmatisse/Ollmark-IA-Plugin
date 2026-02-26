import { Component, inject } from '@angular/core';
import { TestService } from '../../utils/test-service/test-service';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [],
  templateUrl: './test.html',
  styleUrl: './test.css',
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
