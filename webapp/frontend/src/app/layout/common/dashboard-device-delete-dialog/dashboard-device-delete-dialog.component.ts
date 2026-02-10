import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {DashboardDeviceDeleteDialogService} from 'app/layout/common/dashboard-device-delete-dialog/dashboard-device-delete-dialog.service';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-device-delete-dialog',
  templateUrl: './dashboard-device-delete-dialog.component.html',
  styleUrls: ['./dashboard-device-delete-dialog.component.scss']
})
export class DashboardDeviceDeleteDialogComponent implements OnInit, OnDestroy {

    private _unsubscribeAll: Subject<void> = new Subject();

    constructor(
        public dialogRef: MatDialogRef<DashboardDeviceDeleteDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {wwn: string, title: string},
        private _deleteService: DashboardDeviceDeleteDialogService,
    ) {
    }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
      this._unsubscribeAll.next();
      this._unsubscribeAll.complete();
  }

  onDeleteClick(): void {
      this._deleteService.deleteDevice(this.data.wwn)
          .pipe(takeUntil(this._unsubscribeAll))
          .subscribe((data) => {
              this.dialogRef.close(data);
          });

  }
}
