"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = require("@aws-cdk/assert");
const cdk = require("@aws-cdk/core");
const EmrEksApp = require("../lib/emr-eks-app-stack");
test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new EmrEksApp.EmrEksAppStack(app, 'MyTestStack');
    // THEN
    assert_1.expect(stack).to(assert_1.matchTemplate({
        "Resources": {}
    }, assert_1.MatchStyle.EXACT));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1yLWVrcy1hcHAudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVtci1la3MtYXBwLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSw0Q0FBaUY7QUFDakYscUNBQXFDO0FBQ3JDLHNEQUFzRDtBQUV0RCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUNyQixNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUMxQixPQUFPO0lBQ1AsTUFBTSxLQUFLLEdBQUcsSUFBSSxTQUFTLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUMvRCxPQUFPO0lBQ1AsZUFBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxzQkFBYSxDQUFDO1FBQ2hDLFdBQVcsRUFBRSxFQUFFO0tBQ2hCLEVBQUUsbUJBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0FBQ3pCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZXhwZWN0IGFzIGV4cGVjdENESywgbWF0Y2hUZW1wbGF0ZSwgTWF0Y2hTdHlsZSB9IGZyb20gJ0Bhd3MtY2RrL2Fzc2VydCc7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnQGF3cy1jZGsvY29yZSc7XG5pbXBvcnQgKiBhcyBFbXJFa3NBcHAgZnJvbSAnLi4vbGliL2Vtci1la3MtYXBwLXN0YWNrJztcblxudGVzdCgnRW1wdHkgU3RhY2snLCAoKSA9PiB7XG4gICAgY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbiAgICAvLyBXSEVOXG4gICAgY29uc3Qgc3RhY2sgPSBuZXcgRW1yRWtzQXBwLkVtckVrc0FwcFN0YWNrKGFwcCwgJ015VGVzdFN0YWNrJyk7XG4gICAgLy8gVEhFTlxuICAgIGV4cGVjdENESyhzdGFjaykudG8obWF0Y2hUZW1wbGF0ZSh7XG4gICAgICBcIlJlc291cmNlc1wiOiB7fVxuICAgIH0sIE1hdGNoU3R5bGUuRVhBQ1QpKVxufSk7XG4iXX0=